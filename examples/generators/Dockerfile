FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
RUN npm install --production
COPY generators/ ./generators/
EXPOSE 7890
CMD ["node", "server.js"]
