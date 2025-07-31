FROM node:18-alpine

WORKDIR /app

COPY package.json ./frontend/package.json
COPY package-lock.json ./frontend/package-lock.json

RUN npm install --prefix ./frontend

COPY . /app

EXPOSE 3000

CMD ["npm", "start", "--prefix", "./frontend"]
