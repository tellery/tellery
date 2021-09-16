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



Tellery comes with a bucket of lego-ish building blocks. From [dashboards](https://demo.tellery.io/story/L7LxDbPpXCL4BQ9QHx6T4) to reports, you can customize it to your needs. Tellery users can ask questions against [Data assets](https://demo.tellery.io/story/vtkequmHGz5QBD9WjVflU) instead of communicating in only tables and columns. Data assets provide a central business abstraction over your data.


- [x] 💎 Let business users get answers in just a few clicks. Tellery will automatically rollup the metrics on the fly.
- [x] 📏 Delivering insights through data assets makes your metrics consistent and easy to maintain.
- [x] 💪 Data assets can also be incorporated into deep analyses with SQL.



## Features

- Familiar notebook interface where you can create charts and texts with drag-and-drop ease
- Rich text styling and markdown syntax for telling a story
- A modern SQL editor with multi-tabs and auto-complete
- Reference data assets or another question like CTEs
- Capture ad-hoc analyses like taking notes
- Review work and collaborate in real-time with multiplayer
- Import dbt models and sources and inspect their metadata while editing SQL


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


### Production setup

- [Running your own Tellery with Kubernetes](https://tellery.io/docs/getting-started/production-setup)


### Next step

Learn how to start analysis with Tellery:

- [Configure a database](https://tellery.io/docs/how-to-use/configure-database/) to connect to your own dataset
- [Create a new story](https://tellery.io/docs/how-to-use/create-story)
- [Create a Data asset](https://demo.tellery.io/story/vtkequmHGz5QBD9WjVflU)


## Community support

- Looking to get answers to questions? Join the chat on [Slack](https://join.slack.com/t/telleryio/shared_invite/zt-s37tgvo7-QBdpggK_uG6QqJVWhSXlFg)
- Want to report a bug or request a feature? Open an [issue](/issues/new).
- Read all the latest news on [Twitter](https://twitter.com/telleryhq)


## Contributing


Contributions of any kind welcome! If you’re looking for ways to get started, here's a list of ways to help us improve Tellery:


- Add a new database support in [community-supported connectors](https://github.com/tellery/community-supported-connectors)
- [Translation](https://crowdin.com/project/tellery) into other languages
- Issues with [good first issue](https://github.com/tellery/tellery/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) label
- Bugs and issues listed on GitHub

