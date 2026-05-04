#!/usr/bin/env bash
set -euo pipefail

# Registers ECS service scalable targets and applies CPU + Kafka lag target tracking policies.
# Prereqs:
#   - aws cli authenticated
#   - jq installed
#   - custom metric SCM/Workers:ConsumerLag is being published to CloudWatch

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
POLICY_FILE="$ROOT_DIR/target-tracking-policies.json"

CLUSTER_NAME="$(jq -r '.clusterName' "$POLICY_FILE")"
REGION="$(jq -r '.region' "$POLICY_FILE")"

jq -c '.services[]' "$POLICY_FILE" | while read -r svc; do
  SERVICE_NAME="$(jq -r '.serviceName' <<<"$svc")"
  MIN_CAPACITY="$(jq -r '.minCapacity' <<<"$svc")"
  MAX_CAPACITY="$(jq -r '.maxCapacity' <<<"$svc")"

  RESOURCE_ID="service/${CLUSTER_NAME}/${SERVICE_NAME}"

  echo "Registering scalable target for ${RESOURCE_ID}"
  aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id "$RESOURCE_ID" \
    --min-capacity "$MIN_CAPACITY" \
    --max-capacity "$MAX_CAPACITY" \
    --region "$REGION"

  jq -c '.policies[]' <<<"$svc" | while read -r policy; do
    POLICY_NAME="$(jq -r '.policyName' <<<"$policy")"
    POLICY_BODY="$(jq -c '.targetTrackingScalingPolicyConfiguration' <<<"$policy")"

    echo "Applying policy ${POLICY_NAME}"
    aws application-autoscaling put-scaling-policy \
      --policy-name "$POLICY_NAME" \
      --service-namespace ecs \
      --scalable-dimension ecs:service:DesiredCount \
      --resource-id "$RESOURCE_ID" \
      --policy-type TargetTrackingScaling \
      --target-tracking-scaling-policy-configuration "$POLICY_BODY" \
      --region "$REGION"
  done

done

echo "Autoscaling setup complete."

