(function() {
  var eShannonFano = document.querySelector('.shannon-fano');

  var eInputGroup = document.querySelector('.input-group');
  var eText = eInputGroup.querySelector('.text');
  var eFile = eInputGroup.querySelector('.file');

  var eCompress = document.querySelector('.compress');
  var eTable = eCompress.querySelector('table');
  var eDublicateTable = eTable.cloneNode(true);
  var eEntropy = eCompress.querySelector('.entropy');
  var eCodeOptimal = eCompress.querySelector('.code-optimal span');

  var eDecompress = document.querySelector('.decompress');
  var eP = eDecompress.querySelector('p');

  var eDownload = document.querySelector('.download');

  function floor10000(n) {
    return Math.floor(n * 10000) / 10000;
  }

  function fillBits(bits, length, front = false) {
    if (front) {
      while (bits.length % length) {
        bits = '0' + bits;
      }
    } else {
      while (bits.length % length) {
        bits += '0';
      }
    }

    return bits;
  }

  function addBit(dictionary, alphabet, probability, isUp) {
    var bit = '';

    if (Object.keys(dictionary).length !== 0) {
      bit = isUp ? '0' : '1';
    }

    for (var i = 0; i < alphabet.length; i++) {
      var c = alphabet[i];
      var s = dictionary[alphabet[i]] || '';
      dictionary[c] = s + bit;
    }

    if(alphabet.length >= 2) {
      var separator = 1;

      if (alphabet.length !== 2) {
        var totalProbability = 0;
        var halfProbability = 0;

        for (var i = 0; i < probability.length; i++) {
          totalProbability += probability[i];
        }

        for (var i = 0; i < probability.length; i++) {
          halfProbability += probability[i];
          separator = i;

          if (halfProbability > totalProbability - halfProbability) {
            break;
          }
        }
      }

      separator = separator || 1;

      var upAlphabet = alphabet.slice(0, separator);
      var upProbability = probability.slice(0, separator);
      addBit(dictionary, upAlphabet, upProbability, true);

      var downAlphabet = alphabet.slice(separator, alphabet.length);
      var downProbability = probability.slice(separator, probability.length);
      addBit(dictionary, downAlphabet, downProbability, false);
    }
  }

  function encode(text) {
    var dictionary = {};
    var alphabet = [];
    var probability = [];

    eTable.parentNode.replaceChild(eDublicateTable.cloneNode(true), eTable);
    eTable = document.querySelector('table');

    // Part 01 start
    for (var i = 0; i < text.length; i++) {
      var char = text.charAt(i);
      var p = 1 / text.length;

      if (!alphabet.includes(char)) {
        alphabet.push(char);
        probability.push(p);
      } else {
        var index = alphabet.indexOf(char);
        probability[index] += p;
      }
    }

    for (var i = 0; i < probability.length; i++) {
      for (var j = i + 1; j < probability.length; j++) {
        if (probability[i] < probability[j]) {
          var tmp = alphabet[i];
          alphabet[i] = alphabet[j];
          alphabet[j] = tmp;

          tmp = probability[i];
          probability[i] = probability[j];
          probability[j] = tmp;
        }
      }
    }
    
    addBit(dictionary, alphabet, probability, true);

    var q = 0, H = 0;
    for (var i = 0; i < alphabet.length; i++) {
      var tr = document.createElement('tr'), td;
      var code = dictionary[alphabet[i]];

      var qi = probability[i] * code.length;
      var Hi = -1 * probability[i] * Math.log2(probability[i]);

      q += qi;
      H += Hi;

      td = document.createElement('td');
      var char = alphabet[i];

      char === '\n' && (char = 'Enter');
      char === '\t' && (char = 'Tab');
      char.charCodeAt(0) === 32 && (char = 'Space');

      td.innerText = char;
      tr.appendChild(td);

      td = document.createElement('td');
      td.innerText = floor10000(probability[i]);
      tr.appendChild(td);

      td = document.createElement('td');
      td.innerText = code;
      tr.appendChild(td);

      td = document.createElement('td');
      td.innerText = code.length;
      tr.appendChild(td);

      td = document.createElement('td');
      td.innerText = floor10000(qi);
      tr.appendChild(td);

      td = document.createElement('td');
      td.innerText = floor10000(Hi);
      tr.appendChild(td);

      eTable.appendChild(tr);
    }


    var textBits = '';
    for (var i = 0; i < text.length; i++) {
      textBits += dictionary[text.charAt(i)];
    }
    textBits = fillBits(textBits, 8);

    var dictionaryBits = '';
    for (var i = 0; i < alphabet.length; i++) {
      var charBits = fillBits(alphabet[i].charCodeAt(0).toString(2), 16, true);

      dictionaryBits += charBits + dictionary[alphabet[i]] + charBits;
    }
    dictionaryBits = fillBits(dictionaryBits, 8);

    var dictionaryLength = dictionaryBits.length / 8;
    var textLength = textBits.length / 8;
    var byteLength = dictionaryLength + textLength + 4;

    var byte = '';
    var bytes = new Uint8Array(byteLength);

    for (var i = 0; i < dictionaryLength * 8; i++) {
      byte += dictionaryBits.charAt(i);

      if (i % 8 === 7) {
        bytes[Math.floor(i / 8)] = parseInt(byte, 2);
        byte = '';
      }
    }

    for (var i = dictionaryLength * 8; i < (byteLength - 4) * 8; i++) {
      byte += textBits.charAt(i - dictionaryLength * 8);

      if (i % 8 === 7) {
        bytes[Math.floor(i / 8)] = parseInt(byte, 2);
        byte = '';
      }
    }

    bytes[byteLength - 4] = dictionaryLength >> 24 & 255;
    bytes[byteLength - 3] = dictionaryLength >> 16 & 255;
    bytes[byteLength - 2] = dictionaryLength >> 8 & 255;
    bytes[byteLength - 1] = dictionaryLength & 255;

    var blob = new Blob([bytes], { 'type': 'application/octet-stream' });

    eDownload.download = 'Compressed.bin';
    eDownload.href = URL.createObjectURL(blob);



    eCompress.classList.add('active');
    eEntropy.innerText = `q: ${floor10000(q)}, H: ${floor10000(H)}`;
    eCodeOptimal.innerText = (q === H ? 'Да' : 'Нет');
  }

  function decode(input) {
    var archive = '';
    var dictionary = {};
    var text = '';

    var bytes = new Uint8Array(input);

    var byteLength = input.byteLength;
    var dictionaryLength = (bytes[byteLength - 4] << 24) + (bytes[byteLength - 3] << 16) + (bytes[byteLength - 2] << 8) + bytes[byteLength - 1];

    var bits = '';
    for (var i = 0; i < byteLength; i++) {
      bits = fillBits(bytes[i].toString(2), 8, true);

      archive += bits;
    }

    bits = '';
    var char = '';

    for (var i = 0; i < dictionaryLength * 8; i++) {
      bits += archive.charAt(i);

      if (bits.length == 16 && !char ) {
        char = bits;
        bits = '';
      }

      if (bits.substr(-16, 16) === char) {
        dictionary[bits.substr(0, bits.length - 16)] = String.fromCharCode(parseInt(char, 2));
        bits = '';
        char = '';
      }
    }

    bits = '';
    for (var i = dictionaryLength * 8; i < (byteLength - 4) * 8; i++) {
      bits += archive.charAt(i);

      if (dictionary[bits]) {
        text += dictionary[bits];
        bits = '';
      }
    }

    var blob = new Blob([text], { 'type': 'plain/text' });
    eDownload.download = 'Decompresed.txt';
    eDownload.href = URL.createObjectURL(blob);

    eDecompress.classList.add('active');
    eP.innerText = text;
  }

  eInputGroup.addEventListener('focusin', function () {
    eInputGroup.classList.add('focus');
  });

  eInputGroup.addEventListener('focusout', function () {
    eInputGroup.classList.remove('focus');
  });

  eText.addEventListener('input', function () {
    encode(eText.value);

    eDecompress.classList.remove('active');

    if (eText.value) {
      eDownload.classList.add('active');
      eShannonFano.classList.add('active');
    } else {
      eCompress.classList.remove('active');
      eDownload.classList.remove('active');
      eShannonFano.classList.remove('active');
    }
  });

  eFile.addEventListener('change', function (event) {
    var element = event.target;
    var file = element.files[0];

    eCompress.classList.remove('active');
    eDecompress.classList.remove('active');

    if (file) {
      var reader = new FileReader();

      if (/.sf$/i.test(file.name)) {
        reader.onload = function(e) {
          element.value = '';
          decode(e.target.result);
        }

        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = function(e) {
          element.value = '';
          encode(e.target.result);
        }

        reader.readAsText(file);
      }

      eDownload.classList.add('active');
      eShannonFano.classList.add('active');
    }
  });
})();
