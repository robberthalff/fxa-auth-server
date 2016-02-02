FROM mhart/alpine-node

RUN apk add --update --virtual build-dependencies \
    git make gcc g++ python

ENV NODE_ENV=prod

ENV LOG_LEVEL=info
ENV LOG_FORMAT=pretty

ENV PUBLIC_URL=http://127.0.0.1:9000

# ENV SECRET_KEY_FILE ../config/secret-key.json
# ENV PUBLIC_KEY_FILE ../config/public-key.json

ENV TRUSTED_JKUS=http://127.0.0.1:8080/.well-known/public-keys,http://127.0.0.1:10139/.well-known/public-keys

ENV DB_BACKEND=httpdb

ENV IP_ADDRESS=127.0.0.1
ENV PORT=9000

# fraud / abuse server url
# env CUSTOMS_SERVER_URL http://127.0.0.1:7000
env CUSTOMS_SERVER_URL=none

# The url of the corresponding fxa-content-server instance
ENV CONTENT_SERVER_URL=http://127.0.0.1:3030

ENV SMTP_HOST=127.0.0.1
ENV SMTP_PORT=25
ENV SMTP_SECURE=false
ENV SMTP_USER=
ENV SMTP_PASS=

ENV HTTPDB_URL=http://127.0.0.1:8000

ENV VERIFIER_VERSION=0
ENV RESEND_BLACKOUT_PERIOD=0

# set to true to serve directly over https
ENV USE_TLS=false

ENV LOCKOUT_ENABLED=true

# Amazon SNS topic on which to send account event notifications
ENV SNS_TOPIC_ARN=disabled

ENV STATSD_ENABLE=false
ENV STATSD_HOST=localhost
ENV STATSD_PORT=8125
ENV STATSD_SAMPLE_RATE=1

ENV CORS_ORIGIN=*

# root urls of allowed OpenID providers
ENV OPENID_PROVIDERS=

EXPOSE 9000
# EXPOSE 9001
EXPOSE 7000

VOLUME [ "/app/config" ]

copy bin /app/bin
copy config /app/config
copy lib /app/lib
copy scripts /app/scripts
ADD AUTHORS /app/AUTHORS
ADD CHANGELOG.md /app/CHANGELOG.md
ADD LICENSE /app/LICENSE
ADD README.md /app/README.md
ADD package.json /app/package.json

WORKDIR /app

RUN npm i

# Skip mount through volume
# RUN node ./scripts/gen_keys.js

RUN apk del build-dependencies && \
    rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp

CMD node ./bin/key_server.js | node ./bin/notifier.js >/dev/null

