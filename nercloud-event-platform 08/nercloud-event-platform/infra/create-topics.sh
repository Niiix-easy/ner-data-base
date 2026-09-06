#!/bin/sh
set -eu
docker exec neercloud-kafka kafka-topics.sh --bootstrap-server localhost:9092 --create --if-not-exists --topic billing.events --partitions 6 --replication-factor 1
docker exec neercloud-kafka kafka-topics.sh --bootstrap-server localhost:9092 --create --if-not-exists --topic billing.events.retry --partitions 6 --replication-factor 1
docker exec neercloud-kafka kafka-topics.sh --bootstrap-server localhost:9092 --create --if-not-exists --topic billing.events.dlq --partitions 3 --replication-factor 1
echo "Topics criados."
