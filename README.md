# Sala de chat usando node.js y MySQL preparada para uso inmediato mediante Docker Compose

Cómo usar (instrucciones para Ubuntu)

1: Instala Docker Compose
apt-get install docker-compose

2: Descarga los archivos

3: Ajusta los permisos de los archivos de SQL

(dentro del directorio en el que se encuentren los archivos, donde se encuentra el Dockerfile)

chmod 777 sql
chmod 777 sql/init.sql

4: Monta la aplicación con Docker Compose

(dentro del directorio en el que se encuentren los archivos, donde se encuentra el Dockerfile)
docker-compose up

El chat se localiza en el puerto 8080. Se puede comprobar con localhost:8080.
