FROM mysql:8

ADD create_tables.sql /docker-entrypoint-initdb.d
ADD load_data.sql /docker-entrypoint-initdb.d
