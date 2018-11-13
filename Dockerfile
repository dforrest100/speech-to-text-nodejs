
FROM centos:centos6
RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash -
RUN yum install -y nodejs  #

WORKDIR /opt/fischer/stt-tool

# Define working directory.
COPY . /src
WORKDIR /src

# copy over docker specific config file, keep default.json file to docker image
ARG localdev
RUN if [ "$localdev" = "true" ] ; then cp ./config/default-docker.json ./config/default.json; else echo 'Non localdev' ; fi

RUN npm install

EXPOSE 3004 8020
# Define default command.
CMD ["node", "server.js"]
