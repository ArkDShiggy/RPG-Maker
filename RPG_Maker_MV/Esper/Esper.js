//=============================================================================
// Shiggy_Esper.js
//=============================================================================

/*:
* @plugindesc Implements espers a la FF6 ; version 0.2
* @author Shiggy

*/

//(function() {

	var _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
	Game_Actor.prototype.initMembers = function(actorId) {
		_Game_Actor_initMembers.call(this, actorId);	
		this._esper = null;
		this._esperSkills = {};
		this._bonusStats = [0, 0, 0, 0, 0, 0, 0, 0];	
	};
	
	var _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
	Game_Actor.prototype.paramPlus = function(paramId) {
		var value = _Game_Actor_paramPlus.call(this, paramId);
		value += this._bonusStats[paramId];
		return (value);
	}
	
	var _Game_Actor_levelUp = Game_Actor.prototype.levelUp;
	Game_Actor.prototype.levelUp = function() {
		_Game_Actor_levelUp.call(this);
		if (this._esper) {
			var esper = this._esper.item();
			for (var j = 0; j < 8; j++) {
				this._bonusStats[j] += esper.params[j];
			}
		}
	}
	
	Game_Actor.prototype.gainAbilityPoints = function(points, window) {
		if (this._esper) {
			var array = this._esper.skills();
			var esperSkills = this._esperSkills;
			var actor = this;
			console.log(window)
			array.forEach(function(skill) {
				var skillId = skill[0];
				var ratio = skill[1]
				if (esperSkills.hasOwnProperty(skillId)) {
					if (esperSkills[skillId] > 0) {
						esperSkills[skillId] += ratio * points;
					}
					if (esperSkills[skillId] >= 100)
					{
						actor.learnSkill(skillId);
						esperSkills[skillId] = 0;
						window.pushNewSkill(actor,skillId);
					}
				} else {
					esperSkills[skillId] = ratio * points;
					if (esperSkills[skillId] >= 100)
					{
						actor.learnSkill(skillId);
						esperSkills[skillId] = 0;
						window.pushNewSkill(actor,skillId);
					}
				}
			});
		}
	};
	
	Game_Actor.prototype.changeEsper = function(esper) {
		if (this._esper) {
			$gameParty.gainItem(this._esper.item(), 1);
		}
		this._esper = esper;
		if (esper) {
			$gameParty.loseItem(esper.item(), 1);
		}
	};
	
	Game_Actor.prototype.esper = function() {
		return (this._esper);
	}
	
	Game_Actor.prototype.esperSkills = function() {
		return (this._esperSkills);
	}
	
	Game_Enemy.prototype.abilityPoints = function() {
		var note = this.enemy().note;
		var points = parseInt(note.match(/<ability[ -_]points\s*:\s*(\d+)\s*>/)[1]);
		return(points);
	};
	
	Game_Troop.prototype.abilityPointsTotal = function() {
		return this.deadMembers().reduce(function(r, enemy) {
			return r + enemy.abilityPoints();
		}, 0);
	};
	
	BattleManager.makeRewards = function() {
		this._rewards = {};
		this._rewards.gold = $gameTroop.goldTotal();
		this._rewards.exp = $gameTroop.expTotal();
		this._rewards.items = $gameTroop.makeDropItems();
		this._rewards.abilityPoints = $gameTroop.abilityPointsTotal();
	};
	
	var _BattleManager_gainRewards = BattleManager.gainRewards
	BattleManager.gainRewards = function() {
		_BattleManager_gainRewards.call(this);
		var text = "The party earned " + this._rewards.abilityPoints.toString() + " ability points.";
		 $gameMessage.newPage();
		$gameMessage.add('\\.' + text);
		this._newSkills = [];
		$gameParty.allMembers().forEach(function(actor) {
			actor.gainAbilityPoints($gameTroop.abilityPointsTotal(), BattleManager);
		});
		this._newSkills.forEach(function(skill) {
			var text = skill[0] + " learned " + skill[1] + ".";
			$gameMessage.add('\\.' + text);	
		});
	}
	
	BattleManager.pushNewSkill = function(actor, skillId) {
		this._newSkills.push([actor.name(), $dataSkills[skillId].name]);
	};
	
	Window_ItemList.prototype.includes = function(item) {
		switch (this._category) {
		case 'item':
			return DataManager.isItem(item) && item.itypeId === 1;
		case 'weapon':
			return DataManager.isWeapon(item);
		case 'armor':
			return DataManager.isArmor(item) && item.atypeId != 7;
		case 'keyItem':
			return DataManager.isItem(item) && item.itypeId === 2;
		default:
			return false;
		}
	};
	
	Window_MenuCommand.prototype.addMainCommands = function() {
		var enabled = this.areMainCommandsEnabled();
		if (this.needsCommand('item')) {
			this.addCommand(TextManager.item, 'item', enabled);
		}
		if (this.needsCommand('skill')) {
			this.addCommand(TextManager.skill, 'skill', enabled);
		}
		this.addCommand('Espers', 'esper', enabled);
		if (this.needsCommand('equip')) {
			this.addCommand(TextManager.equip, 'equip', enabled);
		}
		if (this.needsCommand('status')) {
			this.addCommand(TextManager.status, 'status', enabled);
		}
	};
	
	var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
	Scene_Menu.prototype.createCommandWindow = function() {
		_Scene_Menu_createCommandWindow.call(this);
		this._commandWindow.setHandler('esper',   this.commandPersonal.bind(this));
	};
	
	var _Scene_Menu_onPersonalOk = Scene_Menu.prototype.onPersonalOk;
	Scene_Menu.prototype.onPersonalOk = function() {
		_Scene_Menu_onPersonalOk.call(this);
		if (this._commandWindow.currentSymbol() == 'esper') {
			 SceneManager.push(Scene_Esper);
		}
	};
		
	function Scene_Esper() {
		this.initialize.apply(this, arguments);
	}

	Scene_Esper.prototype = Object.create(Scene_MenuBase.prototype);
	Scene_Esper.prototype.constructor = Scene_Esper;

	Scene_Esper.prototype.initialize = function() {
		Scene_MenuBase.prototype.initialize.call(this);
	};

	Scene_Esper.prototype.create = function() {
		Scene_MenuBase.prototype.create.call(this);
		this.createSkillWindow();
		this.createSlotWindow();
		this.createFreeWindow();
		this.createListWindow();
		this._listWindow.refresh();
		this._slotWindow.refresh();
		this._freeWindow.refresh();
		this._listWindow.activate();
	};
	
	Scene_Esper.prototype.createSkillWindow = function() {
		this._skillWindow = new Window_EsperSkills(0, 0, Graphics.boxWidth/2, Graphics.boxHeight/2, this.actor());
		this.addWindow(this._skillWindow);
	};

	Scene_Esper.prototype.createSlotWindow = function() {
		var wx = Graphics.boxWidth / 2;
		var wy = 0;
		var ww = Graphics.boxWidth / 2;
		var wh = Graphics.boxHeight / 2;
		this._slotWindow = new Window_EsperData(wx, wy, ww, wh, "equip");
		this.addWindow(this._slotWindow);
		this._slotWindow.setEsper(this.actor().esper());
		this._slotWindow.refresh();
	};

	Scene_Esper.prototype.createFreeWindow = function() {
		var wx = Graphics.boxWidth / 2;
		var wy = Graphics.boxHeight / 2;
		var ww = Graphics.boxWidth / 2;
		var wh = Graphics.boxHeight / 2;
		this._freeWindow = new Window_EsperData(wx, wy, ww, wh, "free");
		this.addWindow(this._freeWindow);
	};
	
	Scene_Esper.prototype.createListWindow = function() {
		var wx = 0;
		var wy = Graphics.boxHeight /2;
		var ww = Graphics.boxWidth / 2;
		var wh = Graphics.boxHeight /2;
		this._listWindow = new Window_EsperList(wx, wy, ww, wh);
		this._listWindow.setEsperWindow(this._freeWindow);
		this._listWindow.setHandler('ok',     this.onListOk.bind(this));
		this._listWindow.setHandler('cancel', this.popScene.bind(this));	
		this._listWindow.setHandler('pagedown', this.nextActor.bind(this));
		this._listWindow.setHandler('pageup',   this.previousActor.bind(this));		
		this.addWindow(this._listWindow);
	};
	
	Scene_Esper.prototype.onListOk = function() {
		var freeSlot = this._listWindow.esper();
		this.actor().changeEsper(freeSlot);
		this._slotWindow.setEsper(this.actor().esper());
		this._listWindow.refresh();
		this._slotWindow.refresh();
		this._freeWindow.refresh();
		this._skillWindow.refresh();
		this._listWindow.activate();
		this._listWindow.select(0);
	};

	Scene_Esper.prototype.onActorChange = function() {
		this._slotWindow.setEsper(this.actor().esper());
		this._slotWindow.refresh();
		this._skillWindow.changeActor(this.actor());
		this._skillWindow.refresh();
		this._listWindow.activate();
	};
	
	function Esper() {
		this.initialize.apply(this, arguments);
	};
	
	Esper.prototype.initialize = function(esper) {
		this._hash = esper;
	}
	
	Esper.prototype.name = function() {
		return (this._hash.name);
	};
	
	Esper.prototype.description = function() {
		return (this._hash.description);
	};
	
	Esper.prototype.params = function() {
		return (this._hash.params);
	};
	
	Esper.prototype.item = function() {
		return (this._hash);
	};
	
	Esper.prototype.skills = function() {
		var note = this._hash.note;
		var matches = note.match(/<skill\s*:\s*(\d+)\s+ratio\s*:\s*(\d+)\s*>/g);
		var result = [];
		if (matches) {
			matches.forEach(function(submatch) {
				match = submatch.match(/<skill\s*:\s*(\d+)\s+ratio\s*:\s*(\d+)\s*>/);
				var temp = [parseInt(match[1]),parseInt(match[2])];
				result.push(temp);
			});
		}
		return (result);
	};
	
	function Window_EsperSkills() {
		this.initialize.apply(this, arguments);
	}

	Window_EsperSkills.prototype = Object.create(Window_Base.prototype);
	Window_EsperSkills.prototype.constructor = Window_EsperSkills;
	
	function Window_EsperSkills() {
		this.initialize.apply(this, arguments);
	};
	
	Window_EsperSkills.prototype.initialize = function(x, y, width, height, actor) {
		Window_Base.prototype.initialize.call(this, x, y, width, height);
		this._actor = actor;
		this.refresh();
	};
	
	Window_EsperSkills.prototype.refresh = function() {
		this.contents.clear();
		this.drawText(this._actor.name(), 0, 0);
		if (this._actor.esper())
		{
			var esperSkills = this._actor.esperSkills()
			var skills1 = Object.keys(esperSkills);
			var esper2 = this._actor.esper()
			console.log(esper2)
			
			var skills2 = esper2.skills();
			var array = [];
			var line = 1;
			var window = this;
			skills2.forEach(function(skill2) {
				if (esperSkills.hasOwnProperty(skill2[0])) {
					window.drawSkill(skill2[0], 0, line * window.lineHeight(), true, false);
				} else {
					window.drawSkill(skill2[0], 0, line * window.lineHeight(), true, true);
				}
				line++;
			});
			skills1.forEach(function(skill1) {
				if (skills2.every(function(skill2) {
					return (skill1 != skill2[0]);
				}) && esperSkills[skill1] > 0) {
					array.push(skill1);
				}
			});
			array.sort(function(a, b) {return (b - a)});
			array.forEach(function(skill) {
				window.drawSkill(skill, 0, line * window.lineHeight(), false, false);
				line++;
			});
		}
	}
	
	Window_EsperSkills.prototype.drawSkill = function(i, x, y, enabled, zero) {
		var skills = this._actor.esperSkills();
		var string = $dataSkills[i].name;
		this.changePaintOpacity(enabled);
		this.drawText(string, x, y);
		console.log(zero)
		if (zero === true)
			string = "0%";
		else if (skills[i] == 0) {
			string = "100%";
		} else {
			string = skills[i].toString() + "%";
		}
		this.drawText(string, x, y, this.contentsWidth(), 'right');
		this.changePaintOpacity(1);
	}
	
	Window_EsperSkills.prototype.changeActor = function(actor) {
		this._actor = actor;
	}
	
	function Window_EsperData() {
		this.initialize.apply(this, arguments);
	}

	Window_EsperData.prototype = Object.create(Window_Base.prototype);
	Window_EsperData.prototype.constructor = Window_EsperData;
	
	Window_EsperData.prototype.initialize = function(x, y, width, height, type) {
		Window_Base.prototype.initialize.call(this, x, y, width, height);
		this._type = type;
		this.contents.fontSize = 24;
	};
	
	Window_EsperData.prototype.setEsper = function(esper) {
		this._esper = esper;
		this.refresh();
	};
	
	Window_EsperData.prototype.refresh = function() {
		this.contents.clear();
		if (this._esper) {
			this.drawName(0, 0);
			this.drawText(this._esper.description(), 0, this.lineHeight() * 2);
			this.drawSkills(0, this.lineHeight() * 3);
			this.drawLevelup(0, this.lineHeight() * 8);
		}
	};
	
	Window_EsperData.prototype.drawName = function(x, y) {
		console.log(this._type)
		if (this._type === "free") {
			string = "Free esper";
		} else {
			string = "Equipped esper";
		}
		this.drawText(string, x, y);
		this.drawText(this._esper.name(), x, y, this.contentsWidth(), 'right');
	};
	
	Window_EsperData.prototype.lineHeight = function() {
		return 24;
	};
	
	Window_EsperData.prototype.drawSkills = function(x, y) {
		var array = this._esper.skills();
		this.drawText("Skills:", x, y);
		for (i = 0; i < array.length; i++) { 
			string = $dataSkills[array[i][0]].name 
			this.drawText(string, x + 24, y + this.lineHeight() * (i + 1));
			string = "X " + array[i][1].toString();
			this.drawText(string, x + 24, y + this.lineHeight() * (i + 1), this.contentsWidth() - 24, 'right');
		}
	}
	
	Window_EsperData.prototype.drawLevelup = function(x, y) {
		var params = this._esper.params();
		this.drawText("Level up bonus:", x, y);
		for (i = 0; i < params.length; i++) { 
			if (params[i] != 0) {
				this.drawText(TextManager.param(i), x + 24, y + this.lineHeight() * (i + 1));
				string = "+ " + params[i].toString();
				this.drawText(string, x + 24, y + this.lineHeight() * (i + 1), this.contentsWidth() - 24, 'right');
			}
		}
	}
	
	function Window_EsperList() {
		this.initialize.apply(this, arguments);
	}
	
	Window_EsperList.prototype = Object.create(Window_Selectable.prototype);
	Window_EsperList.prototype.constructor = Window_EsperList;

	Window_EsperList.prototype.initialize = function(x, y, width, height, actor) {
		Window_Selectable.prototype.initialize.call(this, x, y, width, height);
		this._actor = actor;
		this._data = [];
	};

	Window_EsperList.prototype.maxCols = function() {
		return 1;
	};

	Window_EsperList.prototype.spacing = function() {
		return 48;
	};

	Window_EsperList.prototype.maxItems = function() {
		return this._data ? this._data.length : 1;
	};

	Window_EsperList.prototype.esper = function() {
		var index = this.index();
		if (this._data && index >= 0) {
			if (this._data[index]) {
				return(new Esper(this._data[index]));
			}
		}
		return (null);
	};

	Window_EsperList.prototype.isCurrentItemEnabled = function() {
		return (true);
	};

	Window_EsperList.prototype.includes = function(item) {
		return DataManager.isArmor(item) && item.atypeId == 7;
	};
	
	Array.prototype.clone = function() {
		return this.slice(0);
	};

	Window_EsperList.prototype.makeItemList = function() {
		if (this._actor) {
			this._data = this._actor.espers().clone();
		} else {
			this._data = $gameParty.allItems().filter(function(item) {
				return this.includes(item);
			}, this);
		}
		this._data.push(null);
	};

	Window_EsperList.prototype.drawItem = function(index) {
		var item = this._data[index];
		if (item) {
			var rect = this.itemRect(index);
			rect.width -= this.textPadding();
			this.changePaintOpacity(true);
			this.drawItemName(item, rect.x, rect.y, rect.width);
			this.changePaintOpacity(1);
		}
	};

	Window_EsperList.prototype.setEsperWindow = function(window) {
		this._helpWindow = window;
	};
	
	Window_EsperList.prototype.updateHelp = function() {
		this._helpWindow.setEsper(this.esper());			
	};

	Window_EsperList.prototype.refresh = function() {
		this.makeItemList();
		this.createContents();
		this.drawAllItems();
	};

//})();