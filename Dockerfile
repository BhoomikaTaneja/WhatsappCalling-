FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 19000

CMD ["node", "server.js"]
