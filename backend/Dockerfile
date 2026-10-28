FROM node:20-alpine AS builder

RUN apk update
RUN apk add --no-cache python3 make g++

RUN mkdir -p /home/node/app && chown node:node /home/node/app

USER node

WORKDIR /home/node/app

ARG NODE_ENV=development
ENV NODE_ENV $NODE_ENV

ENV DEBIAN_FRONTEND noninteractive

ARG PORT=8080
ENV PORT $PORT
EXPOSE $PORT

COPY ./package*.json ./
RUN npm install

COPY . .

RUN make build

FROM node:20-alpine AS production

RUN mkdir -p /home/node/app && chown node:node /home/node/app

USER node

WORKDIR /home/node/app

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

COPY --from=builder /home/node/app/package*.json ./
COPY --from=builder /home/node/app/node_modules ./node_modules/
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/Makefile ./
COPY --from=builder /home/node/app/.sequelizerc ./

CMD ["npm", "run", "start"]
