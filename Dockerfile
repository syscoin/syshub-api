FROM node:14

WORKDIR src/

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3001

EXPOSE 127.0.0.1:$PORT:$PORT

CMD [ "node", "app.js" ]
