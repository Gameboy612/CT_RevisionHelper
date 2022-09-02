const default_background_color = [0,0,0,128]

let qna = JSON.parse(FileLib.read("RevisionHelper", "qna.json"));
let settings = JSON.parse(FileLib.read("RevisionHelper", "settings.json"));


let timeBetweenQuestion = settings.timeBetweenQuestion
let defaultTimeForAnswering = settings.defaultTimeForAnswering
let answerCount = settings.answerCount
let correct_multiplier = settings.correct_multiplier
let incorrect_multiplier = settings.incorrect_multiplier
let default_weight = settings.default_weight

let selectedOption = -1

let questionPicked = -1
let databasePicked = -1

let options = []
let question
let question_lines


let file_weights = []
let databases = []
let paths = []

let timeForAnswering = settings.defaultTimeForAnswering

let rvToggle = settings.toggle

let correct_ans_index = -1

function pickDataBase(files) {
    file_weights = []
    databases = []
    paths = []
    let total_weight = 0
    let i = 0
    files.forEach(file => {
        if(file.enabled) {
            paths.push("")
            file_weights.push(0)
            databases.push({})
            paths[i] = file.path
            databases[i] = JSON.parse(FileLib.read("RevisionHelper", file.path));
            databases[i].questions.forEach(q => {
                file_weights[i] += q.weight
            })
            total_weight += file_weights[i]
            i++
        }
    });
    console.log(total_weight.toString())

    let random_number = Math.random() * total_weight;

    total_weight = 0;
    for(let i = 0; i < databases.length; i++) {
        total_weight += file_weights[i];
        if(random_number <= total_weight) {
            databasePicked = i
            return databases[i];
        }
    }
    ChatLib.chat("&c[Revision Helper] None of the QNA files are enabled, please check the settings file.")
    return {questions: []}
}



function pickQuestion(data) {
    selectedOption = -1
    // Calculate Total Weight
    let total_weight = 0;
    let length = data.length;
    for(let i = 0; i < length; i++) {
        total_weight += data[i].weight;
    }
    
    // Generate Random Number
    let random_number = Math.random() * total_weight;
    

    // Find Question
    total_weight = 0;
    for(let i = 0; i < length; i++) {
        total_weight += data[i].weight;
        if(random_number <= total_weight) {
            // Save the question picked
            questionPicked = i
            return data[i];
        }
    }
    return data[-1];
}



function shuffleArray(input_array) {
    let array = input_array
    for(let i = array.length - 1; i > 0; i--) {
        // Find element to Swap
        let j = Math.floor(Math.random() * (i + 1));
        
        // Swap
        let temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
    return array
}



function pickOption(q, ansCount) {
    // Return an array of ansCount answers
    let output
    if(Array.isArray(q.answer)) {
        correct_ans_index = Math.floor(Math.random() * q.answer.length)
        if(Array.isArray(q.feedback)) {
            output = [{option:q.answer[correct_ans_index], correct:true, feedback: q.feedback[correct_ans_index]}]
        } else if(q.feedback) {
            output = [{option:q.answer[correct_ans_index], correct:true, feedback: q.feedback}]
        } else {
            output = [{option:q.answer[correct_ans_index], correct:true}]
        }
    } else {
        correct_ans_index = -1
        output = [{option:q.answer, correct:true, feedback:q.feedback}]
    }

    

    let temp_options = []
    for(let i = 0; i < q.other_options.length; i++) {
        temp_options.push(q.other_options[i].toString())
    }

    for(let i = 0; i < ansCount - 1; i++) {
        // Randomize an output
        let optionid = Math.floor(Math.random() * (temp_options.length))
        let option = temp_options[optionid]
        // Append the option to the output
        output.push({option: option, correct:false})
        // Delete the output from temp_options
        temp_options.splice(optionid, 1)
    }


    // Shuffle output
    return shuffleArray(output)
}

var display = new Display();
function showQuestion(question, options) {
    height = Renderer.screen.getHeight();
    width = Renderer.screen.getWidth()

    World.playSound("random.orb", 0.5, 1)
    
    display.setRenderLoc(width / 2, height / 10);
    display.clearLines()
    display.setLine(0, "Questions: &c(" + countdownTimer.toString() + "&c)")
    display.getLine(0).setScale(1.5)
    let question_split = question.question.split("\n")
    question_lines = question_split.length
    
    for(let i = 0; i < question_lines; i++) {
        display.setLine(i + 1, question_split[i])
        display.getLine(i + 1).setScale(1.5)
    }

    display.getLine(question_lines).setScale(2)
    display.setLine(question_lines + 1, "");
    
    for(let i = 0; i < options.length; i++) {
        display.setLine(i + 2 + question_lines, (i + 1).toString() + ". " + options[i].option)
        display.getLine(i + 2 + question_lines).setScale(1.5)
    }

    
    display.setBackgroundColor(Renderer.color(settings.background_color[0], settings.background_color[1], settings.background_color[2], settings.background_color[3]));
    display.setBackground(DisplayHandler.Background.FULL);
    display.setAlign("center");
}

function findAnswer(options_array) {
    for(let i = 0; i < options_array.length; i++) {
        if(options_array[i].correct) {
            return i + 1
        }
    }
    return -1
}

function checkAnswer(options) {
    let correct_ans = findAnswer(options)
    if(correct_ans == -1) {
        ChatLib.chat("&cError: Cannot find correct answer.")
        return true
    }
    return selectedOption == correct_ans
}


function updateData(path, data) {
    FileLib.write("RevisionHelper", path, JSON.stringify(data, null, 4));
}


function setWeight(questionid, value) {
    qna.questions[questionid].weight = value
    updateData(paths[databasePicked], qna)
}

function multiplyWeight(questionid, multiplier) {
    qna.questions[questionid].weight *= multiplier
    updateData(paths[databasePicked], qna)
}







let countdown = false
let countdownTimer = timeForAnswering


register("tick", tickLoop);

function tickLoop() {
    if(countdown) Countdown()
}


let previousXpos = Player.getX()
let previousYpos = Player.getY()

let seconds_await = 0
let afkTimer = 0
// Ask question every 
register("step", secLoop).setDelay(1);
function secLoop() {
    
    if(previousXpos == Math.round(Player.getX()) && previousYpos == Math.round(Player.getY())) {
        afkTimer++
    }
    else {
        afkTimer = 0
    }
    
    previousXpos = Math.round(Player.getX())
    previousYpos = Math.round(Player.getY())

    if(rvToggle && afkTimer < 20) {
        



        // If every () seconds, activate question
        if(seconds_await == timeBetweenQuestion) {
            activateQuestion()
        }
        if(seconds_await <= timeBetweenQuestion + timeForAnswering && seconds_await >= timeBetweenQuestion) {
            countdown = true
            countdownTimer =  timeForAnswering - (seconds_await - timeBetweenQuestion)
        } else if(seconds_await > timeBetweenQuestion + timeForAnswering){
            countdown = false
            clearDisplay()
            seconds_await = -1


            // Check Answer
            if(checkAnswer(options)) {
                // Set weight for question picked (variable is set at pickQuestion())
                multiplyWeight(questionPicked, correct_multiplier)
                ChatLib.chat("correct")
            } else {
                multiplyWeight(questionPicked, incorrect_multiplier)
                if(Array.isArray(question.answer)) {
                    ChatLib.chat("\n\n&cAnswer Incorrect!\n&aQuestion: &r" + question.question + "\n&aCorrect Answer: &r" + question.answer[correct_ans_index] + "\n")
                } else {
                    ChatLib.chat("\n\n&cAnswer Incorrect!\n&aQuestion: &r" + question.question + "\n&aCorrect Answer: &r" + question.answer + "\n")
                }
                if(question.feedback ) {
                    if(Array.isArray(question.feedback)) {
                        ChatLib.chat("&bExplanation: &r" + question.feedback[correct_ans_index])

                    } else {
                        ChatLib.chat("&bExplanation: &r" + question.feedback)
                    }
                } else {
                }
                ChatLib.chat("\n\n")


                // Public Shaming
                if(settings.public_shaming.enabled) {
                    ChatLib.command(settings.public_shaming.channel + " " + settings.public_shaming.message)
                    setTimeout(() => {ChatLib.command(settings.public_shaming.channel + " " + question.question)}, 500);
                    setTimeout(() => {ChatLib.command(settings.public_shaming.channel + " Answer: " + question.answer)}, 1000);
                    // 

                }

            }
        }
        seconds_await++
    }
}

function Countdown() {
    if (Key_Confirm.isKeyDown() || Key2_Confirm.isKeyDown()) {
        if(selectedOption > 0) seconds_await = timeBetweenQuestion + timeForAnswering
    }

    if (Key_Option1.isKeyDown() || Key2_Option1.isKeyDown()) {
        ChooseOption(1)
    }
    
    if (Key_Option2.isKeyDown() || Key2_Option2.isKeyDown()) {
        ChooseOption(2)
    }
    
    if (Key_Option3.isKeyDown() || Key2_Option3.isKeyDown()) {
        ChooseOption(3)
    }
    
    if (Key_Option4.isKeyDown() || Key2_Option4.isKeyDown()) {
        ChooseOption(4)
    }
    
    if (Key_Option5.isKeyDown() || Key2_Option5.isKeyDown()) {
        ChooseOption(5)
    }
    
    if (Key_Option6.isKeyDown() || Key2_Option6.isKeyDown()) {
        ChooseOption(6)
    }
    
    if (Key_Option7.isKeyDown() || Key2_Option7.isKeyDown()) {
        ChooseOption(7)
    }
    
    if (Key_Option8.isKeyDown() || Key2_Option8.isKeyDown()) {
        ChooseOption(8)
    }
    
    if (Key_Option9.isKeyDown() || Key2_Option9.isKeyDown()) {
        ChooseOption(9)
    }



    //do stuff here
    display.setLine(0, "Questions: &c(" + countdownTimer.toString() + "&c)")
    display.getLine(0).setScale(1.5)
    
    
}

function clearDisplay() {
    display.clearLines()
}

function activateQuestion() {
    updateData("settings.json", settings)
    clearDisplay()

    // Pick Database 
    qna = pickDataBase(settings.question_files)

    // Pick Question
    question = pickQuestion(qna.questions)
    // Pick Option
    options = pickOption(question, answerCount)

    // GetAnswerTime
    if(question.time_limit) {
        timeForAnswering = question.time_limit

    } else {
        timeForAnswering = settings.defaultTimeForAnswering
    }

    // Show
    showQuestion(question, options)

    
    resetOption()
}


var Key_Option1 = getKeyBindFromKey(Keyboard.KEY_NUMPAD1, "Option 1");
var Key2_Option1 = getKeyBindFromKey(Keyboard.KEY_END, "Option 1 (Secondary)");

var Key_Option2 = getKeyBindFromKey(Keyboard.KEY_NUMPAD2, "Option 2");
var Key2_Option2 = getKeyBindFromKey(Keyboard.KEY_DOWN, "Option 2 (Secondary)");

var Key_Option3 = getKeyBindFromKey(Keyboard.KEY_NUMPAD3, "Option 3");
var Key2_Option3 = getKeyBindFromKey(Keyboard.KEY_NEXT, "Option 3 (Secondary)");

var Key_Option4 = getKeyBindFromKey(Keyboard.KEY_NUMPAD4, "Option 4");
var Key2_Option4 = getKeyBindFromKey(Keyboard.KEY_LEFT, "Option 4 (Secondary)");

var Key_Option5 = getKeyBindFromKey(Keyboard.KEY_NUMPAD5, "Option 5");
var Key2_Option5 = getKeyBindFromKey(Keyboard.KEY_NUMPAD5, "Option 5 (Secondary)");

var Key_Option6 = getKeyBindFromKey(Keyboard.KEY_NUMPAD6, "Option 6");
var Key2_Option6 = getKeyBindFromKey(Keyboard.KEY_RIGHT, "Option 6 (Secondary)");

var Key_Option7 = getKeyBindFromKey(Keyboard.KEY_NUMPAD7, "Option 7");
var Key2_Option7 = getKeyBindFromKey(Keyboard.KEY_HOME, "Option 7 (Secondary)");

var Key_Option8 = getKeyBindFromKey(Keyboard.KEY_NUMPAD8, "Option 8");
var Key2_Option8 = getKeyBindFromKey(Keyboard.KEY_UP, "Option 8 (Secondary)");

var Key_Option9 = getKeyBindFromKey(Keyboard.KEY_NUMPAD9, "Option 9");
var Key2_Option9 = getKeyBindFromKey(Keyboard.KEY_PRIOR, "Option 9 (Secondary)");

var Key_Confirm = getKeyBindFromKey(Keyboard.KEY_NUMPADENTER, "Confirm Key");
var Key2_Confirm = getKeyBindFromKey(Keyboard.KEY_RETURN, "Confirm Key (Secondary)");




function getKeyBindFromKey(key, description) {
    var mcKeyBind = Client.getKeyBindFromKey(key);
  
    if (mcKeyBind == null || mcKeyBind == undefined) {
      mcKeyBind = new KeyBind(description, key);
    }
  
    return mcKeyBind;
}


function resetOption() {
    selectedOption = -1
}

function ChooseOption(option) {
    selectedOption = option
    
    for(let i = 0; i < options.length; i++) {
        if(i + 1 == selectedOption) {
            display.setLine(i + 2 + question_lines, "&a" + (i + 1).toString() + ". " + options[i].option)
            display.getLine(i + 2 + question_lines).setScale(1.5)

        } else {
            display.setLine(i + 2 + question_lines, (i + 1).toString() + ". " + options[i].option)
            display.getLine(i + 2 + question_lines).setScale(1.5)
        }
    }
}







    
register("command", (...args) => {
    switch (args[0]) {
        case 'toggle':
            rvToggle = !rvToggle
            settings.toggle = rvToggle
            updateData("settings.json", settings)
            if(rvToggle) {
                ChatLib.chat("\n\n&eRevision Helper is now &aON!")
            } else {
                ChatLib.chat("\n\n&eRevision Helper is now &cOFF!")
            }
            break;
        case 'backgroundcolor':
            if(args[1] == "reset") {
                var undocommand = "/rv backgroundcolor set "
                + settings.background_color[0].toString() + ' '
                + settings.background_color[1].toString() + ' '
                + settings.background_color[2].toString() + ' '
                + settings.background_color[3].toString()
                
                

                var undoMessage = new Message(
                     new TextComponent("&7[Click here to undo]").setClick("run_command", undocommand).setHoverValue(undocommand)
                );

                ChatLib.chat("\n\n\n&aColor Reset!")
                ChatLib.chat(undoMessage)
                ChatLib.chat("\n")
                settings.background_color = default_background_color
            } else if(args[1] == "set") {
                ChatLib.chat("\n\n&aColor Changed!")
                settings.background_color = [parseInt(args[2]), parseInt(args[3]), parseInt(args[4]), parseInt(args[5])]
            } else {
                ChatLib.chat("\n\n&a/rv backgroundcolor reset\n&7 - Resets background color of the tracker.")
                ChatLib.chat("\n&a/rv backgroundcolor set 255 255 255 255\n&7 - Set background color of the tracker to rgba(255,255,255,255).\n\n")
            }
            break;
        default:
            ChatLib.chat("\n\n&a/rv backgroundcolor\n&7 - Apply changes to the background color of the tracker.")
            ChatLib.chat("\n&a/rv toggle\n&7 - Toggles on/off the Revision Helper\n\n")
    } 
    
    }).setName("rv")