/**
 * Online Icelandic spellchecker
 * Inngangur að máltækni TÖL025M - Mikolaj Cymcyk - 20.11.2020
 */

var dict;
var inputbox;
var runButton;
var AreaInput;
var AreaOutput;
var copyButton;
var spellcheck;
var not_found;
var correctable;
var uncorrectable;
var edit_distance = 2;
var correction_count = 10;

var regex_input = new RegExp('\\p{L}+|\\p{N}+|[\\p{P}\\p{M}\\p{S}\\p{Z}\\p{C}]', 'gmu');
var regex_not_word = new RegExp('\\p{N}+|[\\p{P}\\p{M}\\p{S}\\p{Z}\\p{C}]', 'gmu')


document.addEventListener("DOMContentLoaded", () => {
    blinder = document.getElementsByClassName("blinder")[0];
    load_data(blinder);
    manageBoxes();
    manageOutput();
});



function outputResults() {
    d = document.getElementsByClassName("results")[0];
    d.innerHTML = "Misspellings: " + not_found + ", of that " + correctable + " were correctible and " + uncorrectable + " were not."
}

/**
 * Generates a string output from output box with selected corrections;
 */
function generateOutput() {
    str = '';
    AreaOutput.childNodes[0].childNodes.forEach( node => {
        if(node.nodeName == "SPAN"){
            str += node.innerText;
        } else {
            str += node.options[node.selectedIndex].text;
        }
    });
    return str;
}

/**
 * Manages everything and anything to do with parsing  the input 
 * and displaying spellcheked text.
 */
function manageOutput() {
    runButton = document.getElementsByClassName("spellcheck_run")[0];
    runButton.addEventListener("click", () => {
        not_found = 0;
        correctable = 0;
        uncorrectable = 0;
        if(copyButton.disabled) {
            copyButton.classList.add("enabled");
            copyButton.disabled = false;
        }
        if(AreaOutput.disabled) {
            AreaInput.classList.add("enabled");
            AreaOutput.classList.add("enabled");
            AreaOutput.disabled = false;
        }
        if(AreaOutput.childElementCount >= 1) {
            AreaOutput.innerHTML = '';
        }
        input = inputbox.value.replace(/ +/g,' ').replace(/\n /g, '\n').trim();
        tokens = tokenize(input);
        edits = getEditDistances(tokens);
        not_found = Object.keys(edits).length;
        out = []
        for( var i = 0; i < tokens.length; i++ ) {
            str = ''
            while(!(tokens[i] in edits) && i < tokens.length) {
                str += tokens[i++]
            }
            out.push(str);
            if(tokens[i] in edits) {
                token = {}
                token[tokens[i]] = edits[tokens[i]];
                out.push(token);
            }
        }
        output = document.createElement('span');
        output.className = "spellcheck_output_inner";
        out.forEach( o => {
            if (typeof(o) == 'string') {
                elem = document.createElement('span');
                elem.innerHTML = o;
            } else {
                elem = document.createElement('select');
                corrections = [];
                key = Object.keys(o)[0];
                for(var i = 1; i <= edit_distance; i++) {
                    if(i in o[key]) {
                        corrections = corrections.concat(o[key][i].slice(0, correction_count - corrections.length));
                    }
                }
                for(var i = 0; i < corrections.length; i++) {
                    e = document.createElement('option');
                    e.value = i.toString();
                    if( i == 0 ) {
                        e.innerHTML = key;
                    } else {
                        e.innerHTML = corrections[i];
                    }
                    elem.appendChild(e);
                }
            }
            output.appendChild(elem);
        });
        AreaOutput.prepend(output);
        resizeBoxes();
        outputResults();
    });
    copyButton.addEventListener("click", () => {
        el = document.createElement("textarea");
        el.value = generateOutput();
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
    });
}

/**
 * List of strings to get edit distance of.
 * Compared to the icelandic language word set.
 * @param {*String[]} words 
 */
function getEditDistances(words) {
    wordDict = {};
    for(var w=0; w < words.length; w++) {
        if(words[w].match(regex_not_word)) {
            wordDict[words[w]] = words[w];
            continue;
        }
        if(words[w] in wordDict) {
            continue;
        }
        uniqueChars = countUniqueChars(words[w])
        if(words[w].length in dict && uniqueChars in dict[words[w].length] && dict[words[w].length][uniqueChars].includes(words[w])) {
            wordDict[words[w]] = words[w];
            continue;
        }
        lens = {}, lengths = [], uniques = [];
        for(var i=1; i < edit_distance + 1; lens[i++] = []);
        for(var i=words[w].length - edit_distance; i < words[w].length + edit_distance + 1; i++) {
            if(i > 0) lengths.push(i);
        }
        for(var i=uniqueChars - edit_distance; i < uniqueChars + edit_distance + 1; i++) {
            if(i > 0) uniques.push(i);
        }
        for(var i=0; i < lengths.length; i++) {
            for(var j=0; j < uniques.length; j++) {
                if(!(lengths[i] in dict) || !(uniques[j] in dict[lengths[i]])) {
                    continue;
                }
                for(var k=0; k < dict[lengths[i]][uniques[j]].length; k++) {
                    lev = levenshtein(words[w], dict[lengths[i]][uniques[j]][k]);
                    if(lev <= edit_distance) {
                        if(!(lev in lens)) lens[lev] = [];
                        lens[lev].push(dict[lengths[i]][uniques[j]][k]);
                    }
                }
            }
        }
        total = 0;
        Object.keys(lens).forEach( len => {
            total += lens[len].length;
        });
        if(total == 0){
            uncorrectable += 1;
            wordDict[words[w]] = words[w];
        } else {
            correctable += 1;
            wordDict[words[w]] = lens;
        }
    }
    Object.keys(wordDict).forEach(key => {
        if(typeof(wordDict[key]) != "object") {
            if(wordDict[key] == key) {
                delete wordDict[key];
            }
        }
    });
    return wordDict;
}

/**
 * Strips punctuation, and splits into a list of words
 * @param {*String} text 
 */
function tokenize(text) {
    return text.match(regex_input);
}

/**
 * Input box manager. Does stuff to the box, man.
 */
function manageBoxes() {
    AreaInput = document.getElementsByClassName("spellcheck_input")[0];
    AreaOutput = document.getElementsByClassName("spellcheck_output")[0];
    copyButton = document.getElementsByClassName("spellcheck_copy")[0];
    AreaOutput.disabled = true;
    copyButton.disabled = true;
    spellcheck = document.getElementsByClassName("spellcheck")[0];
    inputbox = document.getElementsByClassName("spellcheck_input_text")[0];
    inputbox.setAttribute('style', 'height:' + (inputbox.scrollHeight) + 'px;overflow-y:hidden');
    spellcheck.setAttribute('style', 'height:' + (inputbox.scrollHeight + 95 + 32) + 'px');
    inputbox.addEventListener("input", () => {resizeBoxes();});
    window.addEventListener('resize', () => {resizeBoxes();});
}

/**
 * Resizes the input box to right size
 */
function resizeBoxes() {
    var scrollLeft = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft;
    var scrollTop  = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
    inputbox.style.height = "250px";
    inputbox.style.height = (inputbox.scrollHeight + 48) + 'px';
    if ( AreaOutput.disabled ) {
        spellcheck.style.height = (inputbox.scrollHeight + 95) + 32 + 'px';
    } else {
        spellcheck.style.height = (inputbox.scrollHeight + 95) * 2 + 32 + 'px';
    }
    window.scrollTo(scrollLeft, scrollTop);
}

/**
 * Asynchronous data load
 */
function load_data(d) {
    var client = new XMLHttpRequest();
    client.open('GET', 'https://notendur.hi.is/mic5/Icelandic-Spellchecker/ordmyndir.txt');
    client.onload = function() {
        d.style.display = "none";
        dict = generateDict(client.responseText.split("\n"));
    }
    client.send();
}

/**
 * Generates a dictionary split by word length and later unique character count.
 * This is for much much much more efficient spellchecking.
 * @param {*String[]} words 
 */
function generateDict(words) {
    var dict = {};
    words.forEach( word => {
        len = word.length;
        uniq = countUniqueChars(word);
        if (!(len in dict)) dict[len] = {};
        if (!(uniq in dict[len])) dict[len][uniq] = [];
        dict[len][uniq].push(word);
    });
    return dict;
}

/**
 * Calculates the number of unique characters in string.
 * @param {*String} word 
 */
function countUniqueChars(word) {
    var letters = [];
    for ( var i = 0; i < word.length; i++ ) {
        if ( ! letters.includes( word[ i ] ) ) {
            letters.push(word[i]);
        }
    }
    return letters.length;
}

/**
 * Calculates the edit distance of the two provided strings.
 * @param {*String 1} seq1 
 * @param {*String 2} seq2 
 */
function levenshtein(seq1, seq2) {
    if ( seq1.length == 0 ) return seq2.length;
    if ( seq2.length == 0 ) return seq1.length;
    var i, j, matrix = [];
    for ( i = 0; i <= seq2.length; matrix[ i ] = [ i++ ] );
    for ( j = 0; j <= seq1.length; matrix[ 0 ][ j ] = j++ );
    for ( i = 1; i <= seq2.length; i++ ) {
        for ( j = 1; j <= seq1.length; j++ ) {
            matrix[ i ][ j ] = seq2.charAt( i - 1 ) == seq1.charAt( j - 1 )
                ? matrix[ i - 1 ][ j - 1 ]
                : matrix[ i ][ j ] = Math.min(
                    matrix[ i - 1 ][ j - 1 ] + 1,
                    Math.min( matrix[ i ][ j - 1 ] + 1, matrix[ i - 1 ][ j ] + 1 )
                )
        }
    }
    return matrix[ seq2.length ][ seq1.length ];
}
