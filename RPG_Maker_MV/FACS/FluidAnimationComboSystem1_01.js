//=============================================================================
// FluidAnimationComboSystem.js
//=============================================================================

/*:
* @plugindesc Version 1.01
* @author Shiggy
*
* @param Low Damage Rate
* @desc % of damage when using low attack
* @default 50
*
* @param Medium Damage Rate
* @desc % of damage when using medium attack
* @default 100
*
* @param High Damage Rate
* @desc % of damage when using high attack
* @default 200
*
* @param Low HIT bonus
* @desc HIT bonus when using a low attack
* @default 20
*
* @param Medium HIT bonus
* @desc HIT bonus when using a medium attack
* @default 10
*
* @param High HIT bonus
* @desc HIT bonus when using a high attack
* @default 0
*/

(function() {

	VictorEngine.FluidAnimationComboSystem = VictorEngine.FluidAnimationComboSystem || {};

	FACSParam = PluginManager.parameters('FluidAnimationComboSystem');

	VictorEngine.FluidAnimationComboSystem.loadNotetagsValues = VictorEngine.loadNotetagsValues;
    VictorEngine.loadNotetagsValues = function(data, index) {
        VictorEngine.FluidAnimationComboSystem.loadNotetagsValues.call(this, data, index);
        if (this.objectSelection(index, ['actor'])) {
            VictorEngine.FluidAnimationComboSystem.loadNotes1(data);
        }
		if (this.objectSelection(index, ['enemy'])) {
            VictorEngine.FluidAnimationComboSystem.loadNotes2(data);
        }
    };

	VictorEngine.FluidAnimationComboSystem.loadNotes1 = function(data) {
        data.comboMotion = data.comboMotion || {};
        this.processNotes1(data);
    };

	VictorEngine.FluidAnimationComboSystem.loadNotes2 = function(data) {
		data.ripostId = data.ripostId || 0;
		data.ripostChances = data.ripostChances || [];
		this.processNotes2(data);

	};

	VictorEngine.FluidAnimationComboSystem.processNotes2 = function(data) {
        var match;
		data.finishers = {}
		var array = []
        var regex1 = VictorEngine.getNotesValues('ripost');
        while (match = regex1.exec(data.note)) {
            var regex2 = new RegExp('[ ]*skill[ ]*:([ ]*\\d+[ ]*)', 'gi');
			var regex3 = new RegExp('[ ]*chances[ ]*:(([ ]*\\d+[ ]*,?)*)', 'gi');
			value = regex2.exec(match[1])
			data.ripostId = Number(value[1])
			value = regex3.exec(match[1])
			value[1].split(",").forEach(function(string) {
				data.ripostChances.push(Number(string));

			});
		}
    };

	VictorEngine.FluidAnimationComboSystem.processNotes1 = function(data) {
        var match;
		data.finishers = {}
		var array = []
        var regex1 = VictorEngine.getNotesValues('finisher');
        while (match = regex1.exec(data.note)) {
            var regex2 = new RegExp('(\\d+)[ ]*:(([ ]*\\w+[ ]*,?)*)', 'gi');
			while (value = regex2.exec(match[1])) {
				data.finishers[value[1]] = value[2].split(",").map(function(string) {
					switch(string.trim()){
					case 'low':
						return 1;
						break;
					case 'medium':
						return 2;
						break;
					case 'high':
						return 3;
						break;
					}
				});
			};

		}
    };

    Game_Actor.prototype.comboMotion = function() {
        return this.actor().comboMotion;
    };

	 Game_Actor.prototype.finisherList = function() {
        return this.actor().finishers;
    };

	 Game_Enemy.prototype.ripostId = function() {
        return this.enemy().ripostId;
    };

	 Game_Enemy.prototype.ripostChances = function() {
        return this.enemy().ripostChances;
    };

	var _Game_Action_initialize = Game_Action.prototype.initialize;
	Game_Action.prototype.initialize = function(subject, forcing) {
		_Game_Action_initialize.call(this,subject,forcing);
		this._bonusHit = 0;
		this._bonusDamage = 1 ;
	};

	Game_Action.prototype.comboApply = function(target,bonusAcc,bonusDmg) {
		this._bonusHit = bonusAcc;
		this._bonusDamage = bonusDmg;
		this.apply(target);
	};

	Game_Action.prototype.itemHit = function(target) {
		if (this.isPhysical()) {
			return this.item().successRate * 0.01 * (this.subject().hit + this.subject().hitBonus());
		} else {
			return this.item().successRate * 0.01;
		}
	};
	value = this.applyVariance

	var _Game_Action_applyVariance = Game_Action.prototype.applyVariance;
	Game_Action.prototype.applyVariance = function(damage, variance) {
		damage = _Game_Action_applyVariance.call(this,damage, variance);
		return damage*this._bonusDamage;
	};

	Game_Actor.prototype.comboPoints = function() {
		return 60;
	};

	//aliased
	var _Window_BattleLog_initialize = Window_BattleLog.prototype.initialize;
	Window_BattleLog.prototype.initialize = function() {
		_Window_BattleLog_initialize.call(this);
		SceneManager.battleLog = this;
	};

	var _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
	Scene_Battle.prototype.terminate = function() {
		_Scene_Battle_terminate.call(this)
		SceneManager.battleLog = null;
	};

	//overridden
	Window_BattleLog.prototype.startAction = function(subject, action, targets) {
        this.setupCurrentAction(subject, action, targets);
        var item = action.item();
		this._finisherOn = false;
        var index = VictorEngine.battlerIndex(subject);
        var current = this._currentAction;
        this.push('performActionStart', subject, current.action);
        this.displayAction(subject, item);
		if ((subject instanceof Game_Actor) && (item.id == subject.attackSkillId() )  && ( item == $dataSkills[item.id] ) ){
			this._comboPoints = subject.comboPoints();
			this._comboInput = null
			this._comboTargets = current.targets;
			this._comboSubject = subject
			this._comboOn = true;
			this._comboList = [];
			this._comboIndex = 0;
			this._comboHitBonus = 0;
			this.push('performCombo', subject, current.action, current.targets);
		} else {
			this.push('performAction', subject, current.action, current.targets);
		}
    };

	Window_BattleLog.prototype.performCombo = function(subject, action, targets) {
		if (!this._comboList[this._comboIndex]) {
			console.log('wait')
			this.push('waitForComboInput') ;
		}

		var index = VictorEngine.battlerIndex(subject);
		var user = subject;


			this.push('performMotion', 'effect', user, action, targets);


	}

	 Window_BattleLog.prototype.processMotionIf = function(motion, index, user, action, targets, target) {
        var a = user;
        var b = target;
		var c = targets;
		var d = action;
        var v = $gameVariables._data;
        var item = action ? action.item() : null;
        eval('var result = ' + motion);
        if (result) {
            this._conditionMet[index] = true;
        } else {
            this._skipUntilElse[index] = true;
        }
    };

	Window_BattleLog.prototype.isComboCanceled = function(target) {
		return (!this._comboCancel && target.hp> 0 )
	}

	Window_BattleLog.prototype.continueAnimation = function(subject,targets,action) {
		this._comboIndex += 1;
		if ( this.isComboCanceled(targets[0])) {
			if (this.checkInput(subject) ){
				a = targets[0].ripostChances()[this._comboIndex - 1] || 0
				b = Math.random()*100
				if (  b < a ){
					this._ripostInput = 0;
					this.push('performMotion', 'counter', subject, action, targets);
				} else {
					if (this._finisherId) {
						array = action.createFinisherAction(this._finisherId)
						action2 = array[0]
						targets2 = array[1]
						this.push('performMotion', 'execute', subject, action2, targets2);
						//this.push('continueFinisher',subject);
						return true;
					} else {
						this.performCombo(subject,action,targets);
						return false;
					}
				}
			} else if (this._comboPoints == 0) {
				return true;
			} else {
				return true;
			}
		} else {
			return true;
		}
	}

	 Window_BattleLog.prototype.defaultMotionCounter = function(subject, action) {
        var motion = '';
        motion += 'action: all targets, ripost;';
        motion += 'wait: all targets, action;';
        motion += 'if: ( this.continueRipost(a,c,d) );';
		motion += 'action: all targets, countered;';
		motion += 'else if: (this._ripostInput === 0);';
		motion += 'action: all targets,uncountered;';
        motion += 'end;';
        return motion;
    };

	Window_BattleLog.prototype.defaultMotionRipost = function(subject, action) {
		console.log('test')
        var motion = '';
        motion += 'balloon: subject, 1;';
		motion += 'wait: subject,60;';
        return motion;
    };

	Window_BattleLog.prototype.defaultMotionCountered = function(subject, action) {
        var motion = '';
        motion += 'balloon: subject, 2;';
        return motion;
    };

	Window_BattleLog.prototype.defaultMotionUncountered = function(subject, action) {
        var motion = '';
        motion += 'balloon: subject, 3;';
        return motion;
    };




	Window_BattleLog.prototype.continueRipost = function(subject,targets,action) {
		console.log(subject)
		console.log(targets)
		console.log(action)
		if (this._ripostInput === 1) {
			if (this._finisherId) {
				array = action.createFinisherAction(this._finisherId)
				action2 = array[0]
				targets2 = array[1]
				this.push('performMotion', 'execute', subject, action2, targets2);
			} else {
				this.performCombo(subject,action,targets);
			}
			return true;
		} else {
			subject2 = targets[0];
			action2 = new Game_Action(subject2);
			action2.setSkill(subject2.ripostId());
			targets2 = [subject];
			this.push('performMotion', 'execute', subject2, action2, targets2);
			return false;
		}

	}

	Window_BattleLog.prototype.continueFinisher = function(subject) {
		this._comboIndex += 1;
		if (this._currentAction.targets[0].hp > 0) {
			if (this.checkInput(subject) ){
				action = this._currentAction.action
				targets = this._currentAction.targets
				this.performCombo(subject,action,targets);
			}
		}

	}

	Window_BattleLog.prototype.checkInput = function(subject) {
		a = this._comboList[this._comboIndex]
		this._finisherId = false;
		if (a) {
			switch(a) {
			case 1:
				if (this._comboPoints >= 10) {
				    return true;
				}
				SoundManager.playBuzzer();
				break;
			case 2:
				if (this._comboPoints >= 20) {
				    return true;
				}
				SoundManager.playBuzzer();
				break;
			case 3:
				if (this._comboPoints >= 30) {
					return true;
				}
				SoundManager.playBuzzer();
				break;
			case 'finisher':
				var b = this.checkFinisher(subject);
				if (b) {
					this._finisherId = b;

				}
				return !!b;
				break;
			default :
				return false;
			}
		}
		return false;
	}
	//new


	//new
	Window_BattleLog.prototype.isInputFinished = function() {
		a = !!this._comboList[this._comboIndex]

		if (a) {

		}
		return a;
	};

	//aliased
	var _Scene_Battle_update = Scene_Battle.prototype.update;
	Scene_Battle.prototype.update = function() {
		this._logWindow.getComboInput()
		_Scene_Battle_update.call(this);
	};

	//new
	Window_BattleLog.prototype.getComboInput = function() {
		if (this._ripostInput === 0 && Input.isTriggered('ok') ) {
			this._ripostInput = 1;
		} else if (this._comboOn) {
			if (Input.isTriggered('ok')) {
				this._comboList.push(1);
			}
			if (Input.isTriggered('shift')) {
				this._comboList.push(2);
			}
			if (Input.isTriggered('control')) {
				this._comboList.push(3);
			}
			if (Input.isTriggered('cancel')) {
				this._comboList.push('cancel');
				this._comboOn = false;

			}
			if (Input.isTriggered('pagedown') && this._comboList.length > 0) {
				this._comboList.push('finisher');

			}
		}
	};

	//new




	Window_BattleLog.prototype.comboMotions = function(subject,action) {

			var input_id = this._comboList[this._comboIndex]
			var input = null;
			switch (input_id) {
				case 1:
					input = 'low';
					break;
				case 2:
					input = 'medium';
					break;
				case 3:
					input = 'high';
					break;
				default:
					input = input_id;
			}
			var attack = input + (this._comboIndex%3 + 1).toString();
			this._comboCancel = false;

			switch (input) {
			case 'low':
				this._comboPoints -= 10;
				break;
			case 'medium':
				this._comboPoints -= 20;
				break;
			case 'high':
				this._comboPoints -= 30;
				break;
			case 'finisher':

				return this.actionMotion('execute', subject, action,this._comboTargets);
				break;
			}
/*
			if (this._comboPoints < 0) {

				switch (input) {
				case 'medium':
					this._comboPoints += 20;
					break;
				case 'high':
					this._comboPoints += 30;
					break;
				}
				return '';
			}
*/
			if ( input == 'cancel') {
				this._comboCancel = true;
				this._comboOn = false;
			}

			return this.actionMotion(attack, subject, action);
    };

	Window_BattleLog.prototype.checkFinisher = function(subject) {

		var combo = this._comboList;

		var keys = Object.keys(subject.finisherList())
		var combInd = this._comboIndex
		var result = false;
		keys.forEach(function(string) {
			var id = Number(string)
			var list = subject.finisherList()[id]
			var index = combInd - (list.length )
			var combo2 = combo.slice(index,combInd)

			var a = true;
			if ( (list.length) == combo2.length ) {
				for (var i = 0, l=list.length; i < l; i++) {
					if (list[i] != combo2[i]) {
						a = false;
					}
				}
			} else {
				a = false;
			}

			if (subject.isLearnedSkill(id) && a && subject.canPaySkillCost($dataSkills[id]) ) {
				result =  id;
				subject.paySkillCost($dataSkills[id])
			}
		});
		return result;

	}
// HIT BONUS
	Window_BattleLog.prototype.processMotionEffect = function(motion, index, user, action, targets, target) {
        var list = motion.split(',');
        if (list[1]) {
            var match = (/^(\d+)%?$/gi).exec(list[1].trim());
            if (match) {
                var value = Number(match[1]) / 100;
            } else {
                var code = Array.prototype.slice.call(list, 1).join(',');
                var value = Number(eval(code)) / 100;
            }
        } else {
            var value = 1;
        }
		if (this._comboHitBonus) {
			var hitBonus = this._comboHitBonus ;
		} else {
			var hitBonus = 0;
		}
        var current = this._currentAction;
        var subjects = this.getMotionSubjects(list[0], user, targets, target, index);
        for (var i = 0; i < subjects.length; i++) {
            if (current) {
                var subject = subjects[i];
                var repeats = this.uniqueRepeats(current.unique, subject);
                var stack = subject === user ? index : VictorEngine.battlerIndex(subject);
                for (var j = 0; j < repeats; j++) {
                    this.insert(index, 'waitForTime', 1);
                    this.insert(stack, 'updateStackAction', stack, user, subject, value, hitBonus);
                }
            }
        };
    };

	Window_BattleLog.prototype.updateStackAction = function(index, subject, target, rate,hitBonus) {
        BattleManager.updateStackAction(index, subject, target, rate,hitBonus);
    };

	BattleManager.updateStackAction = function(index, subject, target, rate,hitBonus) {
        subject.setDamageRate(rate);
		subject.setHitBonus(hitBonus)
        VictorEngine.BattleMotions.updateStackAction.call(this, index, subject, target, rate);
    };

	Game_Battler.prototype.setHitBonus = function(hitBonus) {
		this._hitBonus = hitBonus
	};

	Game_Battler.prototype.hitBonus = function() {
		if (!this._hitBonus) {
			this._hitBonus = 0;
		}
		return this._hitBonus;
	};

	var _Game_Battler_onAllActionsEnd = Game_Battler.prototype.onAllActionsEnd;
	Game_Battler.prototype.onAllActionsEnd = function() {
		 _Game_Battler_onAllActionsEnd.call(this);
		 this._hitBonus = 0;
	}

// ANIMATION FIX
	 Game_Battler.prototype.requestCustomMotion = function(index, speed, frames, loop,start) {
        frames = Math.max(frames, 1) || 3;
        speed = Math.max(speed, 1) || 1;
        loop = loop === 'loop' ? 'true' : loop === 'once' ? 'once' : '';
        this._customMotion = {
            index: index - 1,
            loop: loop,
            frames: frames,
            speed: speed,
			start: start
        };
    };

	Sprite_Battler.prototype.startCustomMotion = function(newMotion) {
        var oldMotion = this._motion || {};
        if (oldMotion !== newMotion || this._playMotion) {
            this._motion = newMotion;
            this._motionCount = 0;
			if (!!newMotion.start) {
				this._pattern = newMotion.start;
			} else {
				this._pattern = oldMotion.index !== newMotion.index ? 0 : this._pattern;
			}
            this._playMotion = !newMotion.loop;
        }
    };

	Window_BattleLog.prototype.processMotionMotion = function(motion, index, user, action, targets, target) {
        var list = motion.split(',');
        var value = list[1] ? list[1].toLowerCase().trim() : '';
        var motion = value.match(/\d+/gi);
        var frames = Number(list[2]) || 0;
        var speed = Number(list[3]) || 0;
		var start = Number(list[4]) || 0;
        var loop = list[list.length - 1].toLowerCase().trim();
        var subjects = this.getMotionSubjects(list[0], user, targets, target, index);
        for (var i = 0; i < subjects.length; i++) {
            var subject = subjects[i];
            if (subject.isSpriteVisible()) {
                var stack = subject === user ? index : VictorEngine.battlerIndex(subject);
                if (value === 'action') {
                    subject.performAction(action);
                } else if (value === 'attack') {
                    subject.performAttack();
                } else if (value === 'reset') {
                    subject.requestMotionRefresh()
                } else if (value === 'move') {
                    subject.requestMotionMove()
                } else if (motion) {
                    subject.requestCustomMotion(motion, speed, frames, loop,start)
                } else {
                    subject.requestMotion(value);
                }
            }
        }
        this.insert(index, 'waitForTime', 1);
    };

// DEFEAT BUG FIX

	 BattleManager.processDefeat = function() {
        $gameTroop.aliveMembers().forEach(function(enemy) {
			enemy.performVictory();
		},this);
        VictorEngine.BattleMotions.processDefeat.call(this);
    };

// WAIT METHODS

		//new
	Window_BattleLog.prototype.waitForComboInput = function(subject) {
		this._openInput = true;
		this.setWaitMode('comboInput');
	}

	//overridden

	Window_BattleLog.prototype.updateWaitMode = function() {
		var waiting = false;
		switch (this._waitMode) {
		case 'effect':
			waiting = this._spriteset.isEffecting();
			break;
		case 'movement':
			waiting = this._spriteset.isAnyoneMoving();
			break;
		case 'comboInput':
			waiting = !this.isInputFinished();
			break;
		case 'animation':
			waiting = this._spriteset.isBusy();
			break;
		}
		if (!waiting) {
			this._waitMode = '';
		}
		return waiting;
	};

	Game_Action.prototype.createFinisherAction = function(id) {
		var finisher = new Game_Action(this.subject())
		var targets = [];
		finisher.setSkill(id)
		if (finisher.checkItemScope([2]) ) {
			targets = finisher.makeTargets();
		} else {
			targets = this.makeTargets();
		}
		return ([finisher,targets]);
	}


	Window_BattleLog.prototype.performMotion = function(name, subject, action, targets, target, push) {
        var index;
        var length = $gameParty.maxBattleMembers() + $gameTroop.members().length;
        index = VictorEngine.battlerIndex(target || subject);
        index = ['damage', 'entry', 'escape'].contains(name) ? index + length : index;
        var motions = this.motionValues(name, subject, action, targets, push,target);
        this._stackIndex = index;
        for (var i = 0; i < motions.length; i++) {
            if (push) {
                this.push('processMotion', motions[i], index, subject, action, targets, target);
            } else {
                this.insert(index, 'processMotion', motions[i], index, subject, action, targets, target);
            }
        }
        this._stackIndex = 0;
    };

//PROCESSS MOTION CHANGE
	Window_BattleLog.prototype.motionValues = function(name, subject, action, targets, push,target) {
        var motions = this.setMotionValues(name, subject, action,target);
        switch (name) {
            case 'prepare':
                motions = 'prepare action; wait: all targets, move;' + motions;
                break;
            case 'finish':
                motions = motions + '; finish action;';
                break;
            case 'clear':
                motions = 'clear action;' + motions;
                break;
            case 'return':
                motions = (subject.inHomePosition() || !subject.canMove()) ? '' : motions;
                break;
            case 'evasion':
            case 'magic evasion':
            case 'damage':
                motions = motions + '; flag: user, remove, damage;';
                break;
        }
        motions = motions + '; wait: subject, 1;';
        return this.setupMotion(motions, push);
    };

	Window_BattleLog.prototype.setMotionValues = function(name, subject, action,target) {
        var motion = '';
        if (name === 'action' && subject.isStaticBattler()) {
            motion += 'wait: user, 8;';
            motion += 'whiten: user;';
            motion += 'wait: user, effecting;';
        }
		if ((name === 'effect') && (subject instanceof Game_Actor) && ( action.item().id == subject.attackSkillId() ) && ( action.item() == $dataSkills[action.item().id] )) {
			return this.comboMotions(subject, action);
		}
        if (name !== 'movement' || !subject.noActionMovement()) {
            motion += this.actionMotion(name, subject, action,target);
        }
        return motion;
    };

    Window_BattleLog.prototype.actionMotion = function(name, subject, action,target) {
        var motion = action && action.item() && action.item().battleMotions;
        var result = motion ? action.item().battleMotions[name] : '';
		console.log(name)
		if (target) {
			if ('name' === 'uncountered' || name === 'ripost' || name === 'countered') {
				result = target.battleMotions(name)
			}
		}
        result = result || subject.battleMotions(name);
        result = result || this.defaultMotion(name, subject, action);
        return result;
    };
})();
