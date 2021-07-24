FROM node:12-alpine
RUN apk add --no-cache python g++ make
WORKDIR /app
ENV PORT 80
COPY package.json  src  src/components
RUN yarn install --production
CMD ["node", "src/index.js"]
