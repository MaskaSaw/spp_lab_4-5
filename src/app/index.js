const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const iconv = require('iconv-lite');
const fs = require('fs');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const jquery = require('jquery');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');

const port = 3000;

const _FILE_TOO_BIG_ = "$FILE_TOO_BIG$";
const _SUCCESS_ = "$SUCCESS$";
const _NOTHING_TO_CHANGE_ = "$NOTHING_TO_CHANGE$";
const _AUTHENTICATE_ = "$AUTHENTICATE$";
const _IS_USER_ = "$IS_USER$";
const _SMTH_BAD_ = "$SMTH_BAD$";
const _BAD_TOKEN_ = "$BAD_TOKEN$";
const _FINE_ = "$FINE$";

const page401 = "/authorize.html";
const page401Part = "/authorize-part.html";
const page404 = "/404.html";
const page500 = "/500.html";
const page500Part = "/500-part.html";
const homePage = "/file-loader.html";
const homePagePart = "/file-loader-part.html";
const chatRoom = "/chat.html";
const chatRoomPart = "/chat-part.html";

const chatLink = /^!link\s.+$/;
const linkPart = /^!link\s/;
const protocol = /^!link\shttp:\/\//;
const protocolSafe = /^!link\shttps:\/\//;

const protocolString = "http://";

const commandLogout = "/logout";
const commandHomePage = "/homepage";
const commandChat = "/chatroom";

const maxFileSize = 1024 * 1024;
const maxFileNameLengthBeforeCompression = 20;
const awaitedMaxFiles = 9;
const tokenLife = 18000;
const filesOnServerExtension = ".txt";

let allFileNames = [];
let originalFileNames = [];
let compressedFileNames = [];
let allFilesStatus = [];

let usersOnline = 0;

let schema = buildSchema(`
    type Query {
        page(requestCommand: String): String
        authorize(requestCommand: String, login: String, password: String) : String
    }
`);

let root = {
    page: async function(args) {
        let pageData;
        switch (args.requestCommand) {
            case commandHomePage:               
                result = await new Promise((resolve, reject) => {
                    fs.readFile(__dirname + homePagePart, "utf8", function read(err, data) {
                        if (err) {
                            resolve(_SMTH_BAD_);
                            return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
                        }

                        pageData = data;
                        resolve(_FINE_);
                    });
                });

                return pageData;

            case commandLogout:
                result = await new Promise((resolve, reject) => {
                    fs.readFile(__dirname + page401Part, "utf8", function read(err, data) {
                        if (err) {
                            resolve(_SMTH_BAD_);
                            return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
                        }

                        pageData = data;
                        resolve(_FINE_);
                    });
                });

                return pageData;

            case commandChat:
                result = await new Promise((resolve, reject) => {
                    fs.readFile(__dirname + chatRoomPart, "utf8", function read(err, data) {
                        if (err) {
                            resolve(_SMTH_BAD_);
                            return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
                        }

                        pageData = data;
                        resolve(_FINE_);
                    });
                });

                return pageData;

            default:
                return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
        }
    },
    authorize: async function(args) {
        let pageData;
        let allUsersData;
        let result = await new Promise((resolve, reject) => {
            fs.readFile(__dirname + '/userData/data', "utf8", function read(err, data) {
                if (err) {
                    resolve(_SMTH_BAD_);
                    return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
                }

                allUsersData = data;
                resolve(_FINE_);
            });
        });
            
        if (result == _SMTH_BAD_) {
            return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
        }       

        let regex = new RegExp("!" + args.login + "\\$ : \\$" + args.password + "!");

        if (regex.test(allUsersData)) {
            result = await new Promise((resolve, reject) => {
                fs.readFile(__dirname + homePagePart, "utf8", function read(err, data) {
                    if (err) {
                        resolve(_SMTH_BAD_);
                        return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
                    }

                    pageData = data;
                    resolve(_FINE_);
                });
            });

            if (result == _SMTH_BAD_) {
                return pageData = fs.readFileSync(__dirname + page500Part, "utf8");
            }   

            return pageData;
        } else {
            return pageData = fs.readFileSync(__dirname + page401Part, "utf8");
        }
    }
};

app.use("/secret-graphql-api", graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));

app.use(fileUpload());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
 
app.use(express.static(__dirname + '/public'));

io.on("connection", function(socket) {
    usersOnline++;

    console.log("user connected");
    socket.broadcast.emit("user connected", usersOnline);
    socket.emit("you have connected", usersOnline);

    socket.on("chat message", function(message) {
        let regex = chatLink;

        if (regex.test(message)) {

            if (!protocol.test(message) && !protocolSafe.test(message)) {
                io.emit("chat link", message.replace(linkPart, protocolString));
            } else {
                io.emit("chat link", message.replace(linkPart, ""));
            }
            console.log("chat link");
        } else {
            io.emit("chat message", message);
            console.log("chat message");
        }
    });

    socket.on("someone is typing", () => {
        io.emit("someone is typing");
        console.log("someone is typing");
    });

    socket.on("noone is typing", () => {
        io.emit("noone is typing");
        console.log("noone is typing");
    });

    socket.on("disconnect", () => {
        usersOnline--,

        io.emit("user disconnected", usersOnline);
        console.log("user disconnected");
    });
});

app.get("/", async function(request, response) {
    let decision = await new Promise(async (resolve, reject) => {
        let tokenState = await isTokenValid(request, response, request.cookies.token);
        if (tokenState == _FINE_) {
            resolve(_IS_USER_);
        } else if (tokenState == _BAD_TOKEN_) {
                resolve(_AUTHENTICATE_);
            } else {
                resolve(_SMTH_BAD_);
            }
    });

    if (decision == _IS_USER_) {
        response.status(200).sendFile(__dirname + homePage); 
    } else if (decision == _AUTHENTICATE_) {
            response.status(401).sendFile(__dirname + page401);
        }
});

app.get('/download', async function(request, response) {
    let decision = _IS_USER_;

    if (decision == _IS_USER_) {
        if (!request.body) {
            return response.sendStatus(400);
        }

        let file;
        let fileOriginalName;
        let fileFound = false;;
        for (let i = 0; i < allFileNames.length; i++) {
            if (request.url.match(new RegExp(`\\?downloader${i}=`)) != null) {
                file = __dirname + '/server/' + allFileNames[i] + filesOnServerExtension;
                fileOriginalName = originalFileNames[i];
                fileFound = true;
            }
        }

        if (fileFound) {
            response.status(200).download(file, fileOriginalName, function(err) {
                if (err) {
                    response.status(404).sendFile(__dirname + page404);
                }
            });
        } else {
            response.status(404).sendFile(__dirname + page404);
        }
    } else if (decision == _AUTHENTICATE_) {
            response.status(401).sendFile(__dirname + page401);
    }
});

app.get('*', function(request, response) {
    response.status(404).sendFile(__dirname + page404);
});

app.post("/upload", async function(request, response) {
    let decision = _IS_USER_;

    if (decision == _IS_USER_) {
        if (!request.body) {
    	   return response.sendStatus(400);
        }

        let allFiles = [];
        for (let i = 0; i < awaitedMaxFiles; i++) {
    	    if (request.files.hasOwnProperty(`file${i}`)) {
     	        allFiles[i] = eval(`request.files.file${i}`);
  		    }
        }

        for (let i = 0; i < allFiles.length; i++) {
            if (allFiles[i] != undefined) {
    	        if (allFiles[i].name.length > maxFileNameLengthBeforeCompression) {
    	            compressedFileNames[i] = allFiles[i].name.substr(0, maxFileNameLengthBeforeCompression) + "...";
    	        } else {
    	            compressedFileNames[i] = allFiles[i].name;
    	        }
            }
        }

        for (let i = 0; i < allFiles.length; i++) {
	 	    if (allFiles[i] != undefined) {
	 		    originalFileNames[i] = allFiles[i].name;

	 		    if (allFiles[i].data.length > maxFileSize) {
	 			    allFilesStatus[i] = _FILE_TOO_BIG_;
	 		    } else {
                    let aboutProcess = await loadFileToServerAndDoTask(request, response, allFiles[i], i);

                    if (aboutProcess == _SMTH_BAD_) {
                        return;
                    }

                    if (allFilesStatus[i] != _NOTHING_TO_CHANGE_) {
			 	       allFilesStatus[i] = _SUCCESS_;
                    }
			    }
	 	    }
	    }

        let newPage;
	    let result = await new Promise((resolve, reject) => {
            fs.readFile(__dirname + '/results.html', "utf8", function(err, html) {
                if (err) {
                    resolve(_SMTH_BAD_);
                    return response.status(500).sendFile(__dirname + page500);
                }

                newPage = html;
                resolve(_FINE_);
            });
        });

        let newInfo = "";
        for (let j = 0; j < allFiles.length; j++) {
            if (allFiles[j] != undefined) {
	 	 		newInfo += `<tr id="deleter${j}"><td>${compressedFileNames[j]}</td>`;

            	switch (allFilesStatus[j]) {
            		case _FILE_TOO_BIG_:
            			newInfo += `<td class="fail">Провал</td>
            						<td>Недоступно</td>
            						<td>Размер файла превышал 1МБ`;
            			break;

                    case _NOTHING_TO_CHANGE_:
                        newInfo += `<td class="fail">Провал</td>
                                    <td>Недоступно</td>
                                    <td>В файле не было совпадений`;
                        break;

            		case _SUCCESS_:
            			newInfo += `<td class="success">Успех</td>
            						<td>
            							<form action="/download" method="get" enctype="multipart/form-data">
                    						<input class="downloading-button" type="submit" name="downloader${j}" value="Скачать">
                						</form>
                					</td>
                					<td>-`;
            			break;

            		default:
            			newInfo += `<td class="fail">Провал</td>
            						<td>Недоступно</td>
            						<td>Неизвестная ошибка`;
            			break;
            	}
            			    
         		newInfo += `</td> 
                            <td>
                                <button type="submit" class="downloading-button" onclick="removeElement('deleter${j}')">Убрать</button>
                            </td>
                            </tr>`;
            }
    	}

	 	if (response.statusCode != 500) {
            response.status(200).send(newPage.replace(new RegExp("{FILES-INFO}"), newInfo));
        }
    } else if (decision == _AUTHENTICATE_) {
            response.status(401).sendFile(__dirname + page401);
    }
});

async function isTokenValid(request, response, tokenForCheck) {
    let secret;

    let result = await new Promise((resolve, reject) => {
        fs.readFile(__dirname + '/secret/secret', "utf8", function read(err, secretData) {
            if (err) {
                resolve(_SMTH_BAD_);
                return response.status(500).sendFile(__dirname + page500);
            }

            secret = secretData;
            resolve(_FINE_);
        });
    });
    
    if (result == _SMTH_BAD_) {
        return _SMTH_BAD_;
    }

    return result = await new Promise((resolve, reject) => {
        jwt.verify(tokenForCheck, secret, function(err, decoded) {
            if (err) {
                return resolve(_BAD_TOKEN_);
            }

            resolve(_FINE_);
        });
    }); 
}

async function loadFileToServerAndDoTask(request, response, file, counter) {
	let fileName = getFileName();
	allFileNames[counter] = fileName;

    let result;
	result = await new Promise((resolve, reject) => {
        file.mv(__dirname + '/server/' + fileName + filesOnServerExtension, function(err) {
            if (err) {
                resolve(_SMTH_BAD_);
                return response.status(500).sendFile(__dirname + page500);
            }

            resolve(_FINE_);
        });
    });

    if (result == _SMTH_BAD_) {
        return _SMTH_BAD_;
    }

    let winBuf;
    let content;
   	result = await new Promise((resolve, reject) => {
        fs.readFile(__dirname + '/server/' + fileName + filesOnServerExtension, function read(err, data) {
    		if (err) {
                resolve(_SMTH_BAD_);
                return response.status(500).sendFile(__dirname + page500);
    		}

            content = iconv.decode(data, "win1251");

            resolve(_FINE_);
        });
    });

    if (result == _SMTH_BAD_) {
        return _SMTH_BAD_;
    }

    let remadeString = content + request.body.stringToAdd;

    winBuf = iconv.encode(remadeString, 'win1251'); 

    return result = await new Promise((resolve, reject) => {
        fs.writeFile(__dirname + '/server/' + fileName + filesOnServerExtension, winBuf, function(err) {
    		if (err) {
                resolve(_SMTH_BAD_);
                return response.status(500).sendFile(__dirname + page500);
    		}

            resolve(_FINE_);
		});
    });
}

function getFileName() {
	const fileNameLength = 15;
	const symbolSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
	let fileName = "";

	for (let i = 0; i < fileNameLength; i++) {
		fileName += symbolSet[Math.floor(Math.random()*symbolSet.length)];
	}

	return fileName;
}

server.listen(port);