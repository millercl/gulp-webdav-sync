#!/bin/bash
mkdir -p certs
mkdir -p crl
mkdir -p newcerts
mkdir -p private
mkdir -p pkcs10
rm -f index.txt*
rm -f index.txt.attr*
rm -f serial*
rm -f newcerts/*
touch index.txt
touch index.txt.attr

openssl genrsa -out private/ca.pem 2048
openssl req -config openssl.cnf -new -key private/ca.pem -subj /CN=ca/ -out pkcs10/ca.pem -nodes
openssl ca -config openssl.cnf -create_serial -keyfile private/ca.pem -in pkcs10/ca.pem -extensions v3_ca -selfsign -out certs/ca.pem -batch
openssl verify -CAfile certs/ca.pem certs/ca.pem

openssl genrsa -out private/localhost.pem 2048
openssl req -config openssl.cnf -new -key private/localhost.pem -subj /CN=localhost/ -out pkcs10/localhost.pem -nodes
openssl ca -config openssl.cnf -cert certs/ca.pem -keyfile private/ca.pem -in pkcs10/localhost.pem -out certs/localhost.pem -batch 
openssl verify -CAfile certs/ca.pem certs/localhost.pem
