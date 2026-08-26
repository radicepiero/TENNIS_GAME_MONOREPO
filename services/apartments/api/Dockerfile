FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV PORT=9100
EXPOSE 9100

CMD ["npm", "start"]
