# Relay IRC <img src="https://github.com/Alex313031/Relay-IRC/blob/master/Logo.png" width="64">

- 🆓 **Free and Open-Source**
- ✉️ **Multiple Connections**
- 🤔 **Remember Past Credentials**
- 👋 **Automatically Join Channels After Connecting**
- 🔔 **Desktop Notifications**
- 👔 **Clean, Minimalistic Interface**
- 😈 **Dark Mode**
- 😸 **Built with my [custom AVX compiler optimized Electron](https://github.com/Alex313031/electron-22)**

## Installation

Download releases for Linux and Windows [Here](https://github.com/Alex313031/Relay-IRC/releases)  

For other platforms, you'll have to [build your own](#Building).

## Screenshot
![Main Menu/UI](assets/screenshot.png)

## Building

```shell
$ npm install
$ npm run start
```

 - To start this thing with react/redux devtools:

```shell
$ npm run dev
```

To lint, check types, and run tests:

```shell
$ npm run test
```

While writing code, you might want to watch things:

```shell
# run tests when code changes
$ npm run jest -- --watch

# check types when code changes
$ npm run flow -- --watch
```

To build an executable installer for your OS:

```shell
$ npm run dist
```
