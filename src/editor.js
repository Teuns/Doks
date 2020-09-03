const maxFPS = 1000 / 60;
let lastTick = performance.now();
let fps = 0;

window.addEventListener("load", (() => {
	const canvas = document.getElementById("editor");
	const ctx = document.getElementById("editor").getContext('2d');

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	engine = new Engine(canvas, ctx);

	loop = function() {
		requestAnimationFrame(loop);

		const currentTick = performance.now();

		const delta = currentTick - lastTick;

		fps = Math.round(1000 / (delta / 1));

		lastTick = currentTick - (delta % maxFPS);

		if (delta > maxFPS) {
			engine.render();

			// Show FPS
			if (currentTick != lastTick) {
				setTimeout(() => {
					// console.log(`[-] FPS: ${Math.round(fps)}`);
					// ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.font = "14px Bold Arial";
					ctx.fillText("Debug information: FPS = " + Math.round(fps), 10, 20);
				}, 1000);
			}
		}
	}

	loop();
}));	

let isBold = false;
let stringPos = 0;

class Engine {
	constructor(canvas, ctx) {
		this.canvas = canvas;
		this.ctx = ctx;
		this.initEventHandlers();
		this.line_height = 20;
		this.margin = 96;
		this.strings = [];
		this.ctxs = [];
		this.active_string_pos = 0;
		this.pos = 0;
		this.active_string = "";
		this.messages = [];
	}
	initEventHandlers() {
		document.addEventListener('click', (event) => {
			console.log("[-] initEventHandlers, event.clientY: " + event.clientY);
			this.active_string_pos = Math.floor(event.clientY / (this.line_height + this.margin));
			console.log(`[-] initEventHandlers, click Event, active_string_pos: ${this.active_string_pos}`);
			this.pos = this.clickPos(event.offsetX - this.margin, event.offsetY + this.margin) - this.active_string.length;
			console.log(`[-] initEventHandlers, pos: ${this.pos}`);
		});

		document.addEventListener('mousemove', (event) => {
			if (event.target === this.canvas) {
				document.body.style.cursor = 'text';
			}
		});

		document.addEventListener('keydown', (event) => {
			// console.log("[-] initEventHandlers keyup event: ", event);
		  	const keyName = event.key;

		  	if (stringPos < 0) stringPos = 0;

		  	console.log("stringPos: " + stringPos);

		  	// Add letter to string in array
		  	if (!event.ctrlKey && typeof keyName !== "undefined") {
		  		let x = 0;
		  		this.strings.forEach((string) => {
		  			if (string.y === this.active_string_pos) {
		  				x += this.GetWidth(string.text) + (10 + parseInt(string.fontSize.split("px")[0]) + 10);
		  			}
		  		});

		  		const myText = {
	              	"font-family": "Arial",
	              	"fontSize": "16px",
	              	"pos": stringPos,
	              	"x": x,
	              	"y": this.active_string_pos,
	              	"text": "",
	              	"isBold": isBold
	            };

	            const index = this.strings.findIndex(x => x.pos === stringPos && x.y === this.active_string_pos);

	            console.log("index: ", index);

			  	if (index < 0) {
			  		this.strings.push(myText);
			  	}
			  	if (keyName.length === 1 && !this.pos) {
			  		this.strings[index].text ?
			  		this.strings[index].text += keyName : this.strings[index].text = keyName;
			  	}
			  	else if (keyName.length === 1 && this.pos) this.strings[this.active_string_pos].text = 
			  		insert(this.strings[this.active_string_pos].text, this.pos + this.active_string.length, keyName);
			  	console.log("strings: ", this.strings);
			}

			if (event.keyCode == '38') {
		        this.active_string_pos -= 1;
		    }
		    else if (event.keyCode == '40') {
		        this.active_string_pos += 1;
		    }
		    else if (event.keyCode == '37') {
		       	this.pos -= 1;
		    }
		    else if (event.keyCode == '39') {
		       	this.pos += 1;
		    }
		    else if (event.keyCode == '8') {
				this.strings[this.active_string_pos].text = remove_character(this.strings[this.active_string_pos].text, this.strings[this.active_string_pos].text.length + this.pos - 1);
		    } else if (event.keyCode == '13') {
		    	this.active_string_pos += 1;
		    } else if (event.ctrlKey && event.key === 'b') {
		    	stringPos++;
		    	if (!isBold) {
		    		this.SetBold(true);
		    		}
		    	else {
		    		this.SetBold(false);
		    	}
		 	}

			event.preventDefault();
		});

		document.addEventListener('keydown', (event) => {
	        event.preventDefault();
	    });
	}

	draw(message, x, y, w, h, caret = false) {
		let m_Destination = {
			x: x,
			y: y,
			w: w,
			h: h
		}

		if (message.text.length) {
			if (!this.ctxs.includes(this.ctx)) {
				// console.log("message.text: ", message.fontSize);
				this.ctx.font = message.fontSize + " " + (message.isBold ? " Bold " : "") + message["font-family"];
				this.ctxs[this.ctx] = this.ctx;
			} else {
				this.ctx.font = this.ctxs[this.ctx].font;
			} 
            const textWidth = this.GetWidth(message.text);
            const textHeight = this.GetHeight(this.ctx, message.text);

            let m_textDestination = {
            	x: m_Destination.x + 10,
            	y: m_Destination.y + textHeight / 2,
            	w: textWidth,
            	h: textHeight
            }

			this.ctx.fillText(message.text, m_textDestination.x, m_textDestination.y);

			// Caret
	        if (caret && performance.now() % 1000 < 500) {
	            for (let i = y; i < y + parseInt(this.GetHeight(this.ctx)); i += 1)
	            {
	                if (this.pos) {
	                       	const letter = this.active_string.substring(this.pos + this.active_string.length, this.active_string.length);
	                        let w, h;
	                        w = this.GetWidth(letter);
	                        h = this.GetHeight(this.ctx, letter);
	                        if (m_Destination.w > textWidth) {
	                        	this.ctx.fillRect(x + textWidth - w + 10, i + this.GetHeight(this.ctx) / 2 - this.GetHeight(this.ctx) + 1, 1, 1);
	                        }
	                } else {
	                    if (this.active_string.length && m_Destination.w < textWidth) {
	                    	this.ctx.fillRect(x + m_Destination.w - 5, i + this.GetHeight(this.ctx) / 2 - this.GetHeight(this.ctx) + 1, 1, 1);
	                    } else {
	                    	this.ctx.fillRect(x + textWidth + 10, i + this.GetHeight(this.ctx) / 2 - this.GetHeight(this.ctx) + 1, 1, 1);
	                    }
	                }
	            }
	        }
        }
	}

	render() {
		this.swapBuffers();

		const rect = this.canvas.getBoundingClientRect();

		function compare(a, b) {
		  	if (a.y < b.y) {
		   	 	return -1;
		  	}
		  	if (a.y > b.y) {
		    	return 1;
		  	}
		 	return 0;
		}

		this.strings.sort(compare);

		this.strings.forEach((string, i) => {
			if (string.y === this.active_string_pos && string.pos === stringPos) this.active_string = string.text;
			this.draw(string, 0 + this.margin + string.x, rect.top + (string.y * this.line_height) + this.margin, this.canvas.width, this.line_height, string.y == this.active_string_pos && string.pos == stringPos);
		});
	}

	GetWidth(text) {
		return this.ctx.measureText(text).width;
	}

	GetHeight(font, text = null) {
		// Text is not supported yet
		return this.ctxs[font].font.split("px")[0];
	}

	SetBold(value) {
		isBold = value;
	}

	swapBuffers() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	clickPos(x, y) {
		console.log("x: ", x);

		let length = 0;
		this.strings.forEach((string) => {
			if (string.y === this.active_string_pos) {
				length++;
			}
		});

		let guess_string_pos = length - 1;
		let string_xPos = 0;

		for (let string of this.strings) {
			if (string.x >= x - 0) {
				console.log(true);
				guess_string_pos = string.pos - 1;
			    break;
			}

			if (string.pos === guess_string_pos) {
				string_xPos = string.x;
				break;
			}
		};

		console.log("[-] clickPos, Guessed string_pos (pls work): " + guess_string_pos);
		console.log("[-] clickPos, string_xPos: " + string_xPos);

		stringPos = guess_string_pos;

        const value = this.active_string;

		// determine where the click was made along the string
		let text = value,
			totalW = 0,
			pos = text.length;

		if (x < this.GetWidth(text)) {
				// loop through each character to identify the position
				for (let i = 0; i < text.length; i++) {
			  		totalW += this.GetWidth(text[i]);
			  		if (totalW >= x) {
			    		pos = i;
			    	break;
			 	}
			}
		}

	    return pos;
 	}
}

function intersect(a, b) {
  	return (a.left <= b.right &&
        b.left <= a.right &&
        a.top <= b.bottom &&
        b.top <= a.bottom)
}

function insert(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}

function remove_character(str, char_pos) 
{
  	part1 = str.substring(0, char_pos);
  	part2 = str.substring(char_pos + 1, str.length);
  	return (part1 + part2);
}