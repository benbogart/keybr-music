FROM litestream/litestream:latest AS litestream

FROM node:24

WORKDIR /usr/src/app

COPY . .

ENV HUSKY=0
RUN npm ci
RUN npm run compile && npm run build

COPY --from=litestream /usr/local/bin/litestream /usr/local/bin/litestream

RUN mkdir -p /var/lib/keybr /etc/keybr \
  && chown -R node:node /usr/src/app /var/lib/keybr /etc/keybr \
  && chmod +x ./deploy/cloud-run/entrypoint.sh

ENV NODE_ENV=production \
  DATA_DIR=/var/lib/keybr \
  DATABASE_CLIENT=sqlite \
  DATABASE_FILENAME=/var/lib/keybr/database.sqlite \
  LITESTREAM_CONFIG_PATH=/etc/keybr/litestream.yml

EXPOSE 3000

USER node
CMD ["./deploy/cloud-run/entrypoint.sh"]
