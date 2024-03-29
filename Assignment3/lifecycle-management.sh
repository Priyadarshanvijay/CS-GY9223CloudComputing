set -e

ENVIRONMENT=mxnet_p36
NOTEBOOK_FILE=/home/ec2-user/SageMaker/smlambdaworkshop/training/sms_spam_classifier_mxnet.ipynb

source /home/ec2-user/anaconda3/bin/activate "$ENVIRONMENT" && pip install pandas

jupyter nbconvert "$NOTEBOOK_FILE" --to notebook --ExecutePreprocessor.kernel_name=python3 --execute

source /home/ec2-user/anaconda3/bin/deactivate

# PARAMETERS
IDLE_TIME=10  # 1 minute

echo "Fetching the autostop script"
wget https://raw.githubusercontent.com/aws-samples/amazon-sagemaker-notebook-instance-lifecycle-config-samples/master/scripts/auto-stop-idle/autostop.py

echo "Starting the SageMaker autostop script in cron"
(crontab -l 2>/dev/null; echo "*/1 * * * * /usr/bin/python $PWD/autostop.py --time $IDLE_TIME --ignore-connections") | crontab -