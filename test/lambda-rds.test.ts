import { expect as expectCDK, matchTemplate, MatchStyle, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as LambdaRds from '../lib/infra-stack';

test('RDS exists', () =>{
    const app = new cdk.App();

    const stack = new LambdaRds.LambdaRdsStack(app, 'MyTestStack');

    expectCDK(stack).to(haveResource("AWS::RDS::DBCluster"))
});