FROM confluentinc/cp-kafka:7.4.4

USER root
RUN mkdir -p /opt/jmx_exporter /etc/jmx-exporter \
    && curl -fsSL -o /opt/jmx_exporter/jmx_prometheus_javaagent.jar \
      https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.20.0/jmx_prometheus_javaagent-0.20.0.jar

COPY kafka-jmx-config.yml /etc/jmx-exporter/kafka-jmx-config.yml

