const fs = require("fs")
const fetch = require("node-fetch")
const chalk = require("chalk")
const path = require("path")
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const config = JSON.parse(fs.readFileSync("config.json", "utf8"))
let taken = JSON.parse(fs.readFileSync(path.join(__dirname, "results", "taken.json"), "utf8"))
let available = JSON.parse(fs.readFileSync(path.join(__dirname, "results", "available.json"), "utf8"))
function createString(length,platform) {
    let result = '';
    let characters = '';
    if (config[platform]["stringLowers"]) {characters += "abcdefghijklmnopqrstuvwxyz"}
    if (config[platform]["stringUppers"]) {characters += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
    if (config[platform]["stringNumbers"]) {characters += "0123456789"}
    if (config[platform]["stringSpecials"]) {characters += "-"}
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function checkWord(platform,word) {
    if (taken[platform]["words"][word] || available[platform]["words"][word]) {
        return false
    } else {
        return true
    }
}
function storeWord(platform,word,type) {
    const find = (type === "taken" ? taken : available)
    find[platform]["words"][word] = true
    fs.writeFileSync(`results/${type}.json`, JSON.stringify(find, null, "\t"))
}
const functions = {
    "github": async function(username) {
        if (username.startsWith("-") || username.endsWith("-")) {
            return false
        } else {
            await fetch(`https://github.com/${username}`, {})
            .then((res) => {
                if (res.status == 200) {
                    if (config["github"]["logTaken"] === true) {
                        console.log(`[+] ${chalk.red("Found used github username:")} ${username}`)
                    }
                    storeWord("github",username,"taken")
                    return true
                } else if (res.status == 404) {
                    console.log(`[+] ${chalk.green("Found un-used github username:")} ${username}`)
                    storeWord("github",username,"available")
                    return true
                } else {
                    console.log(`[-] ${chalk.blue("Error while checking github username: ")} ${username}`)
                }
            }).catch(function(err){
                console.log(err)
            })
        }
    }
}
async function start() {
    if (Object.entries(config).length > 0) {
        for (const platform in config) {
            if (Object.entries(config[platform]).length > 0) {
                if (config[platform]["enabled"]) {
                    if (taken[platform]["words"] == undefined ) {
                        taken[platform]["words"] = {}
                        fs.writeFileSync(path.join(__dirname, "results", "taken.json"), JSON.stringify(taken, null, "\t"), "utf8" )
                    }
                    if (available[platform]["words"] == undefined) {
                        available[platform]["words"] = {}
                        fs.writeFileSync(path.join(__dirname, "results", "available.json"), JSON.stringify(available, null, "\t"), "utf8" )
                    }
                    if (functions[platform]) {
                        if (config[platform]["scanWords"]) {
                            for (let word of fs.readFileSync("words.json", "utf8").split(/\n+/)) {
                                word = word.replace(/\r?\n|\r/g, '')
                                if (checkWord(platform,word)) {
                                    if (!await functions[platform](word)) {
                                        continue
                                    }
                                } else {
                                    continue
                                }
                                await sleep(config[platform]["cooldownTime"] * 1000)
                            }
                        } else if (config[platform]["scanString"]) {
                            while (true) {
                                const word = createString(config[platform]["stringLength"] || 5, platform)
                                if (platform == "github" && (word.startsWith("-") || word.endsWith("-"))) {
                                    continue
                                } else if (checkWord(platform, word)) {
                                    if (!await functions[platform](word)) {
                                        continue
                                    }
                                }
                                await sleep(config[platform]["cooldownTime"] * 1000)
                            }
                        }
                    } else {
                        console.log(`You have not put a function for ${chalk.green(platform)}.`)
                    }
                } else {
                    continue
                }
            }
        }
    }
}
start()