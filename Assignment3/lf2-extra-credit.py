import boto3
import logging

def lambda_handler(event, context):
    client = boto3.client('sagemaker')
    client.start_notebook_instance(NotebookInstanceName='SageMaker-Tutorial')
    # client.stop_notebook_instance(NotebookInstanceName='SageMaker-Tutorial')
    return 0