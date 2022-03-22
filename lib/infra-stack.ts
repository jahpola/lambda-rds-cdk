import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from 'path';
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2'; 
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from "constructs";
import {
  CfnOutput,
  Duration,
  Stack,
  StackProps,
  RemovalPolicy,
} from 'aws-cdk-lib';

export class LambdaRdsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    
    // VPC subnet types are
    // ISOLATED: Isolated Subnets do not route traffic to the Internet (in this VPC).
    // PRIVATE.: Subnet that routes to the internet, but not vice versa.
    // PUBLIC..: Subnet connected to the Internet
    const vpc = new Vpc(this, 'network', {
      cidr: '10.0.0.0/16',
      natGateways:1, // In production this should be 3, remember AZ design in AWS ie design for loss of 1 az always
      subnetConfiguration: [
        {
          name: 'public', subnetType: SubnetType.PUBLIC,
        },
        {
          name: 'private', subnetType: SubnetType.PRIVATE_WITH_NAT
        },
        {
          name: 'db-net', subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ]
    });

    // Manually creating security group => needs sg, ingress,egress rules etc created manually
    // Instead we are using .connection system, see below for example .connection use

    // If we want to rds to use isolated subnets we need to some manual stuff
    const db_subnet = new rds.SubnetGroup(this, 'db-subnet', {
      description: 'Isolated DB net',
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED}
    });

    const db = new rds.ServerlessCluster(this, 'db', {
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      defaultDatabaseName: 'serverless',
      vpc: vpc,
      scaling: {
        autoPause: Duration.minutes(10),
        minCapacity: 1,
        maxCapacity: 4
      },
      credentials: rds.Credentials.fromGeneratedSecret("serverless"),
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY, // Just delete the db, this is hazard!
      // default ie no subnetgroup = private_with_nat automatically selected
      // note that changing these values will destroy the old db and create new one
      subnetGroup: db_subnet
    });

    // Yes, the lambda code is utter crap... should be nuked from orbit and rewritten 
    const reader = new NodejsFunction(this, 'reader-function', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'main',
      entry: path.join(__dirname, '../src/db-reader/main.ts'),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
      },
      environment: {
        HOST: db.clusterEndpoint.hostname,
        DBNAME: db.secret?.secretValueFromJson('dbname').toString()!,
        USER: db.secret?.secretValueFromJson('username').toString()!,
        SECRET: db.secret?.secretValueFromJson('password').toString()!
      },
      vpc: vpc,
      vpcSubnets: {
// PRIVATE_WITH_NAT is required with outside access usually
// ISOLATTON might require private link+api etc endpoints, 
// recommendation: just use private_with_nat unless working in high security environments
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT 
      },
      architecture: lambda.Architecture.ARM_64,
    });

    // Allow access from reader lambda without creating a sg..
    db.connections.allowDefaultPortFrom(reader)
    
    // Allows DataAPI access
    //db.grantDataApiAccess(reader)

    // Outputs for import/export across stacks as needed below
    new  CfnOutput(this, 'VPCid', {
      value: vpc.vpcId,
      description: "VPC id",
      exportName: "vpc-id"
    });

  }
}
