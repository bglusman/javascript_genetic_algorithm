/**
 * Copyright (c) 2007, Benjamin C. Meyer
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the Benjamin Meyer nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

function Chromosome(bitsPerValue, numberOfValues) {
    this.bitString = new String();
    this.fitnessValue = 0;
    this.numberOfValues = numberOfValues;
    this.bitsPerValue = bitsPerValue;
    this.maxInRange = Math.pow(2, bitsPerValue);
    this.args = [];
    // init with a random value
    for (var i = 0; i < bitsPerValue * numberOfValues; ++i) {
        this.bitString += (Math.random() > 0.5) ? 1 : 0;
    }
    
    // Take the binary string 01010110, get the decimal value and then put it between the ranges
    this.value = function(value, fitness) {
        var str = this.bitString.substring(value * this.bitsPerValue, (value + 1) * this.bitsPerValue);
        var intValue = parseInt(str, 2);
        return fitness.getArg(intValue, this.maxInRange);
    };

    this.computeFitness = function(fitness) {
        for (var i = 0; i < this.numberOfValues; ++i) {
            this.args[i] = this.value(i, fitness);
        }
        return fitness.fitness(this.args);
    };

    this.mutate = function() {
        var flipPoint = Math.floor(Math.random() * this.bitString.length);
        var end = this.bitString.substring(flipPoint + 1);
        var flip = ((this.bitString.charAt(flipPoint) == "1") ? "0" : "1");
        this.bitString = this.bitString.substring(0, flipPoint);
        this.bitString += flip;
        this.bitString += end;
    };

    this.crossover = function(other) {
        var crossoverPoint = Math.random() * this.bitString.length;
        this.bitString = this.bitString.substring(0, crossoverPoint)
                      + other.bitString.substring(crossoverPoint);
    };
}

function Population(size, fitness, mutationRate, crossoverRate)
{
    this.people = [size];
    this.fitness = fitness;
    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;

    var bits = fitness.maxArg().toString(2).length + 1;
    for (var i = 0; i < size; ++i) {
        this.people[i] = new Chromosome(bits, fitness.numberOfArgs());
    }

    this.comparePeople = function(a, b){ return a.fitnessValue - b.fitnessValue; };
    this.buildNextGeneration = function() {
        var peopleSize = this.people.length;
        // Calculate the fitness values of all the items and then sort by rank
        for (var i = 0; i < peopleSize; ++i) {
            this.people[i].fitnessValue = this.people[i].computeFitness(this.fitness);
        }
        this.people.sort(this.comparePeople);
        
        // replace those that get crossovered or mutated
        var loosers = this.crossoverRate + this.mutationRate;
        var remaining = Math.round(peopleSize * (1 - loosers));
        for (var i = remaining; i < peopleSize; ++i) {
            this.people[i].bitString = this.people[peopleSize - i].bitString;
            if ((Math.random() * loosers) > this.mutationRate) {
                this.people[i].mutate();
            } else {
                var choice = Math.round(Math.random() * remaining);
                this.people[i].crossover(this.people[choice]);
            }
        }
    };
}

function run()
{
    try {
        var fitness = new (eval(document.forms[0].fitness.value));
    } catch (e) {
        alert("Fitness function does not evaluate: " + e);
        return;
    }

    var generations = document.forms[0].generations.value;
    var populationSize = document.forms[0].populationSize.value;
    var mutationRate = parseFloat(document.forms[0].mutationRate.value);
    var crossoverRate = parseFloat(document.forms[0].crossoverRate.value);
    
    // Check args
    if (crossoverRate > 1 || mutationRate > 1 || crossoverRate + mutationRate > 1 ) {
        alert("cross over and mutation rate combined need to be smaller then 1.0");
        return;
    }
    if (populationSize * crossoverRate + mutationRate < 1) {
        alert("populationSize * crossoverRate + mutationRate needs to be smaller then 1.0");
        return;
    }

    var population = new Population(populationSize, fitness, mutationRate, crossoverRate);

    var log = [];
    var logStr = [];
    try {
        for (var i = 0; i < generations; ++i)
        {
                population.buildNextGeneration();
                if (log[log.length - 1] != population.people[0].fitnessValue) {
                    log[log.length] = population.people[0].fitnessValue;
                    logStr[logStr.length] = "Generation " + i +": " + population.people[0].fitnessValue;
                }
        }
    } catch (e) {
        alert("When executing function:" + e.message);
        return;
    }

    var best = population.people[0];
    document.forms[0].best.value = "";
    for (var i = 0; i < fitness.numberOfArgs(); ++i) {
        document.forms[0].best.value += best.value(i, fitness) + "; ";
    }
    document.forms[0].maxFitness.value = best.fitnessValue;

    var canvas = document.getElementById('graph');
    if (canvas.getContext){
        var w = canvas.width;
        var h = canvas.height;
        var canvasContext = canvas.getContext('2d');
        canvasContext.clearRect(0, 0, w, h);
        
        // draw horizontal lines
        for (var i = 0; i < h; ++i){
            canvasContext.fillRect(0, 10 + i * 10, 1, w);
        }
        
        // Create background gradient
        var linearGradient = canvasContext.createLinearGradient(0, 0, 0, w);
        linearGradient.addColorStop(0, '#00ABEB');
        linearGradient.addColorStop(0.75, '#fff');
        linearGradient.addColorStop(1, '#fff');
        canvasContext.fillStyle = linearGradient;
        canvasContext.fillRect(0,0,w,h);

        canvasContext.fillStyle = '#fef';
        for (var i = 0; i < h; i += 10) {
            canvasContext.fillRect(2, 10 + i, w - 2, 1);
        }
        
        linearGradient = canvasContext.createLinearGradient(0, 0, 0, w);
        linearGradient.addColorStop(1, '#00ABEB');
        linearGradient.addColorStop(0.75, '#000');
        linearGradient.addColorStop(0, '#000');
        canvasContext.fillStyle = linearGradient;
        canvasContext.strokeRect(1, 1, w - 2, h - 2);
        for (var i = 0; i < log.length; ++i) {
            canvasContext.fillRect(5 + i * 5, h - log[i] - 2, 3, log[i]);
        }
    }
    var graphData = document.getElementById('graphdata'); 
    graphData.innerHTML = logStr.join("<br>");
    
    var args = []
    for (var i = 0; i < best.numberOfValues; ++i) {
        args[i] = best.value(i, fitness);
    }
    fitness.paint(args);
    
    delete fitness;
    delete population;
}
