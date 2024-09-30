FROM node:20-alpine

RUN apk update && apk add netcat-openbsd

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3050
EXPOSE 3051

CMD ["node", "app.js"]
