#!/bin/bash

egrep -rin "fixme|todo" *|grep -v ^lib/flexsdk|grep -v ^Binary > issues
