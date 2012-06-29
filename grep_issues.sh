#!/bin/bash

this_file=$(echo "$0" | sed 's/.*\///')

egrep -rin "fixme|todo" * --exclude-dir=flexsdk | grep -v ${this_file} | egrep -v "issues*" | grep -v ^Binary > issues
