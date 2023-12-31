#!/usr/bin/env bash

rm -rf ./infra/root_chart/app/
cp -r ./config/app/ ./infra/root_chart/app/

rm -rf ./infra/cron_chart/app/
cp -r ./config/app/ ./infra/cron_chart/app/
