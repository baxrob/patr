#!/bin/bash

# TODO: test [ -d flex_path ] and warn about flex path
flex_path=flexsdk/bin/mxmlc
src_filename=flashEngine.as
swf_filename=flashEngine.swf

cmd="${flex_path} -use-network=false -o ${swf_filename} -file-specs ${src_filename} -static-link-runtime-shared-libraries=true"

echo executing: $cmd

$cmd
