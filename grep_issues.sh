#!/bin/bash

egrep -ri "fixme|todo" *|grep -v ^lib/flexsdk|grep -v ^Binary > issues
