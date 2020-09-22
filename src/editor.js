import "./editor.css";
import "./long-press-event.min.js";

const maxFPS = 1000 / 60;
let lastTick = performance.now();
let fps = 0;
let frameCounter = 0;
let oldHeight = 0;

window.addEventListener("load", (() => {
	const canvasEls = document.querySelectorAll("#editor");
	canvasEls.forEach((canvas) => {
		const ctx = canvas.getContext('2d');

		canvas.width = canvas.clientWidth;
		canvas.height = canvas.parentNode.clientHeight * 2;
		canvas.style.height = canvas.height + 'px';
		oldHeight = canvas.height;

		const engine = new Engine(canvas, ctx);

		const loop = function() {
			requestAnimationFrame(loop);

			const currentTick = performance.now();

			const delta = currentTick - lastTick;

			frameCounter++;

			if (frameCounter == 60) {
				fps = Math.round(1000 / (delta / 1));
				frameCounter = 0;
			}

			lastTick = currentTick - (delta % maxFPS);

			if (delta > maxFPS) {
				engine.render();

				// Show FPS
				if (currentTick != lastTick) {
					// console.log(`[-] FPS: ${Math.round(fps)}`);
					ctx.save();
					ctx.font = "14px Arial";
					ctx.fillStyle = "#a8a8a8";
					ctx.fillText("Debug information: BuildId: " + __BUILDID__ + " FPS = " + Math.round(fps) + ", document length: " + engine.GetxPos().string.length, 10, 30);
					ctx.restore();
					
					// ctx.beginPath();
					// ctx.lineTo(0, 10);
					// ctx.lineTo(200, 10);
					// ctx.stroke();
				}
			}
		}

		loop();
	});
}));	

let m_copiedText = "";
let fontFamily = "Arial";
let fontSize = "16px";
let stringPos = 0;

let selection = [ 0, 0 ];
let selectionArr = new Array();
let doSelection = false;
let selectionStart = 0;

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
		this.isBold = false;
	}

	initEventHandlers() {
		window.addEventListener("scroll", () => {
			// this.canvas.style.top = -window.scrollY + 'px';
		});

		this.canvas.addEventListener('click', (event) => {
			const rect = this.canvas.getBoundingClientRect();
			if (Math.round((event.offsetY - rect.top - this.margin) / this.line_height) < ((this.canvas.clientHeight - this.margin * 2) / this.line_height))
				this.active_string_pos = Math.round((event.offsetY - rect.top - this.margin) / this.line_height);
			if (this.active_string_pos < 0) this.active_string_pos = 0;
			console.log(`[-] initEventHandlers, click Event, active_string_pos: ${this.active_string_pos}`);
			this.pos = this.clickPos(event.offsetX - this.margin, event.offsetY + this.margin) - this.active_string.length;
			// console.log(`[-] initEventHandlers, pos: ${this.pos}`);
			selectionStart = this.clickPos(event.offsetX - this.margin, event.offsetY + this.margin) - this.active_string.length;
			if (doSelection) {
				doSelection = false;
				selectionArr = [];
			}
		});

		this.canvas.addEventListener('long-press', (event) => {	
			if (doSelection) {
				doSelection = false;
				selectionArr = [];
			} else {
				doSelection = true;
			}
		});

		this.canvas.addEventListener('mousemove', (event) => {
			if (event.target === this.canvas) {
				document.body.style.cursor = 'text';

				if (doSelection) {
					const rect = this.canvas.getBoundingClientRect();
					this.active_string_pos = Math.round((event.offsetY - rect.top - this.margin) / this.line_height);

					this.textSelection(event.offsetX - this.margin, event.offsetY + this.margin);
				}
			}
		});

		const self = this;

		document.addEventListener('keydown', (event) => {
			// console.log("[-] initEventHandlers keyup event: ", event);
		  	const keyName = event.key;

		  	if (stringPos < 0) stringPos = 0;
		  	// console.log("stringPos: " + stringPos);

		  	// Add letter to string in array
		  	if (!event.ctrlKey && typeof keyName !== "undefined") {
		  		let x = 0;

		  		const text = {
	              	"font-family": fontFamily,
	              	"fontSize": fontSize,
	              	"pos": stringPos,
	              	"x": 0,
	              	"y": this.active_string_pos,
	              	"text": "",
	              	"isBold": this.isBold
	            };

	            const index = this.strings.findIndex(x => x.pos === stringPos && x.y === this.active_string_pos);

			  	if (index < 0) {
			  		text.x = this.GetxPos().x;
			  		this.strings.push(text);
			  	}
			  	if (keyName.length === 1 && !this.pos && index >= 0) {
			  		this.strings[index].text ?
			  		this.strings[index].text += keyName : this.strings[index].text = keyName;
			  		const _string = this.GetxPos().string;
			  		const textWidth = this.GetWidth(_string);
		            if (textWidth + this.margin * 2 >= this.canvas.width - this.margin) {
		            	console.log(true);
		            	this.active_string_pos += 1;
		            	stringPos = 0;
		            	console.log("this.active_string_pos: ", this.active_string_pos);
		            	return false;
		            }
			  	}
			  	else if (keyName.length === 1 && this.pos) this.strings[index].text = 
			  		insert(this.strings[index].text, this.pos + this.active_string.length, keyName);
			  	
			  	// console.log("strings: ", this.strings);
			}

			if (event.keyCode == '38') {
		        this.active_string_pos -= 1;
		    }
		    else if (event.keyCode == '40') {
		        this.active_string_pos += 1;
		    }
		    else if (event.keyCode == '37') {
		       	this.pos -= 1;
		       	if (this.pos === -this.active_string.length - 1) {
		       		stringPos--;
		       		this.pos = 0;
		       	}
		    }
		    else if (event.keyCode == '39') {
		       	this.pos += 1;
		       	if (this.pos === 0) {
		       		stringPos++;
		       		this.pos = -this.active_string.length - 1;
		       	}
		    }
		    else if (event.keyCode == '8') {
		    	const index = this.strings.findIndex(x => x.pos === stringPos && x.y === this.active_string_pos);
				this.strings[index].text = remove_character(this.strings[index].text, this.strings[index].text.length + this.pos - 1);
		    } else if (event.keyCode == '13') {
		    	if (this.active_string_pos >= (((this.canvas.parentNode.clientHeight * pages) - this.margin * 2) / this.line_height) - 2) 
		    		this.canvas.parentNode.scrollTo(this.canvas.parentNode.scrollTop, this.canvas.parentNode.scrollTop + this.line_height / 2);

		    	if (this.active_string_pos >= ((this.canvas.clientHeight - this.margin * 2) / this.line_height))
				{
					console.log("Reached end of page");
				}

		    	this.active_string_pos += 1;
		    	const text = {
	              	"font-family": fontFamily,
	              	"fontSize": fontSize,
	              	"pos": stringPos,
	              	"x": 0,
	              	"y": this.active_string_pos,
	              	"text": " ",
	              	"isBold": this.isBold
	            };
	            this.strings.push(text);
	            this.pos = -1;
		    } else if (event.ctrlKey && event.key === 'b') {
		    	if (!this.isBold) {
		    		this.SetBold(true);
		    		}
		    	else {
		    		this.SetBold(false);
		    	}
		 	} else if (event.ctrlKey && event.key === 'c') {
		 		this.copyText();
		 	} else if (event.ctrlKey && event.key == 'v') {
		 		// alert("This is not supported in FireFox. Sorry for the inconvience.");
		 		const index = this.strings.findIndex(x => x.pos === stringPos && x.y === this.active_string_pos);
				this.strings[index].text += m_copiedText;
		 	}

			event.preventDefault();
		});

		document.getElementById('SetBold').addEventListener('click', function(e) {
			alert("SetBold");
	    	self.SetBold(e.target.checked);
		});

		document.getElementById('fontSize').addEventListener('change', function(e) {
			const size = e.target.options[e.target.selectedIndex].value;
			self.SetFontSize(size);
    	});

    	document.getElementById('fontFamily').addEventListener('change', function(e) {
			const font = e.target.options[e.target.selectedIndex].value;
			self.SetFontFamily(font);
    	}); 

    	document.addEventListener('keydown', (event) => {
	        event.preventDefault();
	    });
	}

	GetxPos() {
		this.ctx.save();
		let x = 0;
		let h = 0;
		let _string = "";
		this.strings.forEach((string) => {
	  		if (string.y === this.active_string_pos) {
	  			this.ctx.font = (string.isBold ? "bold " : "") + string.fontSize + " " + string["font-family"];
	  			x += this.GetWidth(string.text);
	  			if (string.pos === 0) x += this.margin;
	  			_string += string.text;
	  		}
	  		h += parseInt(string.fontSize.split("px")[0]);
	  	});
	  	this.ctx.restore();
	  	return { x: x, h: h, string: _string };
	}

	draw(message, x, y, w, h, caret = false) {
		let m_Destination = {
			x: x,
			y: y,
			w: w,
			h: h
		}

		if (message.text.length) {
			this.ctx.font = (message.isBold ? "bold " : "") + message.fontSize + " " + message["font-family"];
			if (!this.ctxs.includes(this.ctx)) {
				this.ctxs[this.ctx] = this.ctx;
			} else {
				this.ctx.font = this.ctxs[ctx];
			} 
            const textWidth = this.GetWidth(message.text);
            const textHeight = this.GetHeight(this.ctx, message.text);

            let m_textDestination = {
            	x: m_Destination.x,
            	y: m_Destination.y + textHeight / 2,
            	w: textWidth,
            	h: textHeight
            }

	        if (doSelection) {
	        	for (let el in selectionArr) {
                	// console.log("i = " + " [ " + selectionArr[el].start + ", " + selectionArr[el].end + " ] ");
                	// console.log("y = " + selectionArr[el].y);
                	const selection = [ selectionArr[el].start, selectionArr[el].end ];
                	try {
                		if (selectionArr[el].pos === message.pos && selectionArr[el].y === message.y) this.drawSelection(m_textDestination.y, m_textDestination.x, selectionArr[el].y, selection);
                	} catch (e) {
                		// console.log("Error: " + e);
                	}
            	}
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
	                        	this.ctx.fillRect(x + textWidth - w , i + this.GetHeight(this.ctx) / 2 - this.GetHeight(this.ctx) + 1, 1, 1);
	                        }
	                } else {
	                    if (this.active_string.length && m_Destination.w < textWidth) {
	                    	this.ctx.fillRect(x + m_Destination.w - 5, i + this.GetHeight(this.ctx) / 2 - this.GetHeight(this.ctx) + 1, 1, 1);
	                    } else {
	                    	this.ctx.fillRect(x + textWidth, i + this.GetHeight(this.ctx) / 2 - this.GetHeight(this.ctx) + 1, 1, 1);
	                    }
	                }
	            }
	        }
        }
	}

	drawSelection(y, x, yPos, selection) 
    {
        const selectionString = this.strings.find(x => x.pos === stringPos && x.y === yPos).text;

        // console.log("selectionString: ", selectionString);

        const text = selectionString.substr(selection[0] + selectionString.length - 1);

        const selectionText = text.substr(0, selection[1] + text.length);
        const selectionOffsetText = selectionString.substr(0, selection[0] + selectionString.length - 1);

        let selectionWidth, selectionHeight, selectionOffset;

        selectionWidth = this.GetWidth(selectionText);
        selectionHeight = this.GetHeight(this.ctx, selectionText);
        
        selectionOffset = this.GetWidth(selectionOffsetText);

        const rect = this.canvas.getBoundingClientRect();

        const selectionRectangle = {
        	x: x + selectionOffset,
        	y: y - this.GetHeight(this.ctx),
        	w: selectionWidth,
        	h: selectionHeight
        }

        // console.log("[-] drawSelection, selectionRectangle: ", selectionRectangle);

        this.ctx.save()

        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = "#2980b9";
        this.ctx.fillRect(selectionRectangle.x, selectionRectangle.y, selectionRectangle.w, selectionRectangle.h);
   		this.ctx.globalAlpha = 1.0;

   		this.ctx.restore();
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

		for (let i = 0; i < pages; i++) {
			this.ctx.beginPath();
			this.ctx.lineTo(0, (oldHeight / i));
			this.ctx.lineTo(this.canvas.width, (oldHeight / i));
			this.ctx.stroke();
		}

		this.strings.forEach((string, i) => {
			if (string.y === this.active_string_pos && string.pos === stringPos) this.active_string = string.text;
			this.draw(string, string.pos === 0 ? this.margin + string.x : string.x, rect.top + (string.y * this.line_height) + this.margin, this.canvas.width, this.line_height, string.y == this.active_string_pos && string.pos == stringPos);
		});
	}

	GetWidth(text) {
		return this.ctx.measureText(text).width;
	}

	GetHeight(font, text = null) {
		// Text is not supported yet
		return this.ctxs[font].font.match(/([\d.]+)*px/)[1];
	}

	SetBold(value) {
		this.isBold = value;
		stringPos++;
	}

	SetFontFamily(font) {
		fontFamily = font;
		stringPos++;
	}

	SetFontSize(size) {
		fontSize = size;
		stringPos++;
	}

	swapBuffers() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	clickPos(x, y) {
		// console.log("x: ", x);

		let length = 0;
		this.strings.forEach((string) => {
			if (string.y === this.active_string_pos) {
				length++;
			}
		});

		let guess_string_pos = length - 1;
		let string_xPos = 0;

		for (let string of this.strings) {
			if (string.y == this.active_string_pos && string.x >= x - 0) {
				guess_string_pos = string.pos - 1;
			    break;
			}

			if (string.pos === guess_string_pos) {
				string_xPos = string.x;
				break;
			}
		};

		console.log("[-] clickPos, Guessed string_pos (pls work): " + guess_string_pos);
		// console.log("[-] clickPos, string_xPos: " + string_xPos);

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

 	textSelection(x, y) {
        const curPos = this.clickPos(x, y) - this.active_string.length;
        const start = Math.min(selectionStart, curPos);
        const end = Math.max(selectionStart, curPos);

        if (stringPos < 0) stringPos = 0;
        if (this.active_string_pos < 0) this.active_string_pos = 0;

        if (selection[0] != start || selection[1] != end) {
            const selectionDest = [start, end];
            const selection = {
            	start: start,
            	end: end,
            	pos: stringPos,
            	y: this.active_string_pos
            }

            const p = selectionArr.findIndex(x => x.pos === stringPos && x.y === this.active_string_pos);

            // console.log("p: ", p);
    
            if(p >= 0) {
                // int i = std::distance(selectionArr.begin(), p);
                selectionArr[p].start = start;
                selectionArr[p].end = end;
            } else {
                selectionArr.push(selection);
            }

            console.log("selectionArr: ", selectionArr);
            console.log("strings: ", this.strings);
        }
    }

    copyText() {
    	function sortByY(a, b) {
		  return a.y < b.y;
		}

        if (doSelection && this.active_string.length) {
            selectionArr.sort(sortByY);

            let copiedText = "";
            for (let el in selectionArr) {
            	const selection = [ selectionArr[el].start, selectionArr[el].end ];

                const text = this.strings[selectionArr[el].y].text.substr(selection[0] + this.active_string.length - 1);

                copiedText += text.substr(0, selection[1] + text.length);
            }

           	console.log("[debug copyText] text: " + copiedText);

           	m_copiedText = copiedText;
            navigator.clipboard.writeText(copiedText);
        }
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
  	const part1 = str.substring(0, char_pos);
  	const part2 = str.substring(char_pos + 1, str.length);
  	return (part1 + part2);
}