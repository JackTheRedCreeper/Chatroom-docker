USE db_node;
CREATE TABLE message (message varchar(300), user_name varchar(20), timest time, msg_id int, primary key (user_name, msg_id) );

CREATE USER 'nodeChat'@'%' IDENTIFIED BY '123';
GRANT ALL ON *.* TO 'nodeChat'@'%';
