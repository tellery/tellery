<p align="center">
  <a href="https://tellery.io">
    <img src="https://tellery.io/img/logo-dark.png" width="250px" alt="Tellery" />
  </a>
</p>
<p align="center">
    <a href="https://tellery.io">Website</a> |
    <a href="https://demo.tellery.io">Demo</a> |
    <a href="https://tellery.io/docs">Docs</a> |
    <a href="https://tellery.io/docs/changelog">Changelog</a> |
    <a href="https://twitter.com/TelleryHQ">Twitter</a>
    <br /><br />
    <a href="https://github.com/tellery/tellery/actions/workflows/docker-tellery.yml">
        <img src="https://github.com/tellery/tellery/actions/workflows/docker-tellery.yml/badge.svg?branch=main" />
    </a>
    <a href="https://github.com/tellery/tellery/actions/workflows/codeql-analysis.yml">
        <img src="https://github.com/tellery/tellery/actions/workflows/codeql-analysis.yml/badge.svg" />
    </a>
    <a href="/LICENSE">
        <img alt="license" src="https://img.shields.io/github/license/tellery/tellery?logo=apache" alt="license" />
    </a>
    <a title="Crowdin" target="_blank" href="https://crowdin.com/project/tellery">
        <img src="https://badges.crowdin.net/tellery/localized.svg">
    </a>
</p>


Tellery allows you abstract essential data transformation/business logic, and reuse it in future contexts through metrics. Metrics are maintainable and shareable data models across dashboards and reports. They are defined consistently and always up to date.


To deliver better value of the metrics, Tellery comes with a bucket of building blocks and rich text styling features. Want a real-time dashboard? A feature-specific analysis? An anomalies investigation? You can tailor it to your need to unlock the value of data.


## Features

- Declare data transformation/metrics using SQL and reuse them everywhere
- Familiar notebook interface where you can organize charts and texts with drag-and-drop ease
- A modern SQL editor with multi-tabs and auto-complete
- Write analytical narratives using Markdown syntax
- Capture exploratory analyses and associate them with bi-directional links
- Collaborate and review work in real-time with multiplayer


## Supported databases

- [Officially supported connectors](https://tellery.io/docs/available-connectors)
- [Community-supported connectors](https://github.com/tellery/community-supported-connectors)


## Recording

![Tellery Product Usage Recording](https://tellery.io/img/home/tellery-usage-recording.gif)



## Getting started


### Try demo


Try this [online demo](https://demo.tellery.io) where you can click around and see Tellery in action - no installation required!


### Run the demo project with docker

Open your terminal, and run:

```bash
# Clone the Tellery repo
git clone https://github.com/tellery/tellery.git

# Change directories into the demo directory
cd tellery/deploy/compose

# View or edit config file (optional)
# vim .env

# Run docker compose
docker-compose up
```
You can now access it on http://localhost:8000.

The default account is `admin@tellery.local` and password is `tellery`.

## Next step

Learn how to start analysis with Tellery:

- [Configure a database](https://tellery.io/docs/how-to-use/configure-database/) to connect to your own dataset
- [Create a new story](https://tellery.io/docs/how-to-use/create-story)


## Community support

- Looking to get answers to questions? Join the chat on [Slack](https://join.slack.com/t/telleryio/shared_invite/zt-s37tgvo7-QBdpggK_uG6QqJVWhSXlFg)
- Read all the latest news on [Twitter](https://twitter.com/telleryhq)

## Reporting bugs and contributing code

- Want to report a bug or request a feature? Open an [issue](/issues/new).
