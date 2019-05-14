$(function LaunchLogic() {  
    $(".logout-button").click(function(wind) {   
        wind.preventDefault();

		    let command = "/logout"
		    let query = `query Page($command: String) {
            page(requestCommand: $command)
            }`;

		    fetch('/secret-graphql-api', {
  			    method: 'POST',
  			    headers: {
    			      'Content-Type': 'application/json',
    			      'Accept': 'application/json',
  			    },
  			    body: JSON.stringify({
    			      query,
    			      variables: { command },
  			    })
		    })
  		  .then(response => response.json())
  		  .then(data => {
  			   clearInterval(importantTimer);

           let deadPart = document.getElementsByTagName("body");
			     let html = document.getElementsByTagName("html");
			     html[0].removeChild(deadPart[0]);

			     let body = document.createElement("body");
			     body.innerHTML = data.data.page;
			     html[0].appendChild(body);

			     LaunchLogic();
        });
    });  

    $(".chat-button").click(function(wind) {   
        wind.preventDefault();

		    let command = "/chatroom"
		    let query = `query Page($command: String) {
			      page(requestCommand: $command)
			      }`;

		    fetch('/secret-graphql-api', {
  			    method: 'POST',
  			    headers: {
    			      'Content-Type': 'application/json',
    			      'Accept': 'application/json',
  			    },
  			    body: JSON.stringify({
    			      query,
    			      variables: { command },
  			    })
		    })
  		  .then(response => response.json())
  		  .then(data => {
  			    clearInterval(importantTimer);

            let deadPart = document.getElementsByTagName("body");
			      let html = document.getElementsByTagName("html");
			      html[0].removeChild(deadPart[0]);

			      let body = document.createElement("body");
			      body.innerHTML = data.data.page;
            let script = document.createElement("script");
            script.src = "interactions-with-server.js";
      
            body.appendChild(script);
			      html[0].appendChild(body);

            LaunchLogic();
        });
    });  

    $(".button.authorize-button").click(function(wind) {   
        wind.preventDefault();

        let login = $("#login-field").val();
        let password = $("#password-field").val();

		    let command = "/homepage"
		    let query = `query Authorize($command: String, $login: String, $password: String) {
			      authorize(requestCommand: $command, login: $login, password: $password)
			      }`;

		    fetch('/secret-graphql-api', {
  			    method: 'POST',
 			      headers: {
    			      'Content-Type': 'application/json',
    			      'Accept': 'application/json',
  			    },
  			    body: JSON.stringify({
    			      query,
    			      variables: { command, login, password },
  			    })
		    })
  		  .then(response => response.json())
  		  .then(data => {
            let deadPart = document.getElementsByTagName("body");
			      let html = document.getElementsByTagName("html");
			      html[0].removeChild(deadPart[0]);

			      let body = document.createElement("body");
			      body.innerHTML = data.data.authorize;
			      html[0].appendChild(body);

            let regex = new RegExp("password-field");

            if (!regex.test(data.data.authorize)) {
			          let script1 = document.createElement("script");
			          script1.src = "preloading-script.js";
			          let script2 = document.createElement("script");
			          script2.src = "new-files.js";

			          body.appendChild(script1);
			          body.appendChild(script2);
            }

			      LaunchLogic();
        });
    });  
});