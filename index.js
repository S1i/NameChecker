const fs = require("fs")
const fetch = require("node-fetch")
const chalk = require("chalk")
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function createString(length,platform) {
    var result = '';
    var characters = '';
    let config = JSON.parse(fs.readFileSync("config.json", "utf8"))
    if (config[platform]["stringLowers"]) {characters += "abcdefghijklmnopqrstuvwxyz"}
    if (config[platform]["stringUppers"]) {characters += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
    if (config[platform]["stringNumbers"]) {characters += "0123456789"}
    if (config[platform]["stringSpecials"]) {characters += "-"}
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function checkWord(platform,word) {
    let words = config[platform]["words"]
    if (words["available"][word] || words["taken"][word]) {
        return false
    } else {
        return true
    }
}
function storeWord(platform,word,type) {
    config[platform]["words"][type][word] = true
    fs.writeFileSync(`config.json`, JSON.stringify(config, null, "\t"))
}
const functions = {
    "github": async function(username) {
        if (username.startsWith("-") || username.endsWith("-")) {
            return false
        } else {
            await fetch(`https://github.com/${username}`, {})
            .then((res) => {
                if (res.status == 200) {
                    console.log(`[+] ${chalk.red("Found used username:")} ${username}`)
                    storeWord("github",username,"taken")
                    return true
                } else if (res.status == 404) {
                    console.log(`[+] ${chalk.green("Found un-used username:")} ${username}`)
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
fs.readFile("config.json", async (err,data) => {
    if (err) {
        console.log(err)
    } else if (data) {
        const parsedData = JSON.parse(data)
        if (Object.entries(parsedData).length > 0) {
            for (const platform in parsedData) {
                if (Object.entries(parsedData[platform]).length > 0) {
                    if (parsedData[platform]["enabled"]) {
                        if (parsedData[platform]["words"] == undefined || Object.entries(parsedData[platform]["words"]).length != 2) {
                            parsedData[platform]["words"] = {"available": {},"taken": {}}
                            fs.writeFileSync(`config.json`, JSON.stringify(parsedData, null, "\t"))
                        }
                        if (functions[platform]) {
                            if (parsedData[platform]["scanWords"]) {
                                for (let word of fs.readFileSync("words.json", "utf8").toString().split(/\n+/)) {
                                    word = word.replace(/\r?\n|\r/g, '')
                                    if (checkWord(platform,word)) {
                                        if (!functions[platform](word)) {
                                            continue
                                        }
                                    } else {
                                        continue
                                    }
                                    await sleep(parsedData[platform]["cooldownTime"] * 1000)
                                }
                            } else if (parsedData[platform]["scanString"]) {
                                while (true) {
                                    const word = createString(parsedData[platform]["stringLength"] || 5, platform)
                                    if (platform == "github" && (word.startsWith("-") || word.endsWith("-"))) {
                                        continue
                                    } else if (checkWord(platform,word)) {
                                        if (!functions[platform](word)) {
                                            continue
                                        }
                                    }
                                    await sleep(parsedData[platform]["cooldownTime"] * 1000)
                                }
                            }
                        } else {
                            console.log(`You have not put a function for the corresponding platform, platform being ${chalk.green(platform)}.`)
                        }
                    } else {
                        continue
                    }
                }
            }
        }
    }
})
