import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as LambdaRds from '../lib/infra-stack';

test('RDS exists', () =>{
    const app = new cdk.App();

    const stack = new LambdaRds.LambdaRdsStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::RDS::DBCluster",1);
});