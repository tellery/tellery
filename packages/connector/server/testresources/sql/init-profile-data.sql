create
extension if not exists hstore;

create table profile
(
    id         varchar(128) primary key,
    type       varchar(128) not null,
    credential varchar(128),
    configs    hstore
);

create table integration
(
    id         serial primary key,
    profile_id varchar(128) references profile (id) not null,
    type       varchar(128)                         not null,
    configs    hstore
);