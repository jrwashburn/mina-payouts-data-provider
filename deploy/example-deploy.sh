#!/bin/bash

kubectl delete secret ledger-upload-api-password
kubectl delete secret block-db-query-password
kubectl delete secret block-db-query-certificate
kubectl delete secret ledger-db-query-password
kubectl delete secret ledger-db-query-certificate
kubectl delete secret ledger-db-command-password
kubectl delete secret ledger-db-command-certificate

kubectl create secret generic ledger-upload-api-password --from-literal LEDGER_UPLOAD_API_PASSWORD=""

kubectl create secret generic block-db-query-password --from-literal BLOCK_DB_QUERY_PASSWORD=""
kubectl create secret generic block-db-query-certificate --from-file BLOCK_DB_QUERY_CERTIFICATE=/ca-certificate.crt
kubectl create secret generic ledger-db-query-password --from-literal LEDGER_DB_QUERY_PASSWORD=""
kubectl create secret generic ledger-db-query-certificate --from-file LEDGER_DB_QUERY_CERTIFICATE=/ca-certificate.crt
kubectl create secret generic ledger-db-command-password --from-literal LEDGER_DB_COMMAND_PASSWORD=""
kubectl create secret generic ledger-db-command-certificate --from-file LEDGER_DB_COMMAND_CERTIFICATE=/ca-certificate.crt

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
sed -i '' "s|mppdp:v.*|mppdp:v$VERSION|g" deploy/deployment.yaml
echo "Version updated to $VERSION in deployment files."

docker build -f ./deploy/Dockerfile.linux -t [myreg]/mppdp:v$VERSION .
docker tag [myreg]/mppdp:v$VERSION [registry.mycloud.com]/[repo]/mppdp:v$VERSION
docker push [registry.mycloud.com]/[repo]/mppdp:v$VERSION
kubectl apply -f ./deploy/[realdeployment].yaml
echo Finished deploying, waiting 10 seconds for deployments to restart pods.
sleep 10
for POD in $(kubectl get pods -o jsonpath='{.items[*].metadata.name}')
do
  echo "Logs for $POD:"
  kubectl logs $POD
done