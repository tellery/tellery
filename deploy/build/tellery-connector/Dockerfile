FROM adoptopenjdk/openjdk8:centos

RUN yum install -y python3 postgresql-devel python3-devel.x86_64 make automake gcc gcc-c++ kernel-devel
RUN pip3 install --upgrade pip
RUN pip3 install --upgrade pip setuptools
RUN pip3 install setuptools_rust wheel
RUN pip3 install dbt==0.20.0
