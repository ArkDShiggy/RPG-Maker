class Game_Map
   def add_event(event)
    # find an available indexp
    index = @events.empty? ? 1 : @events.keys.max + 1
    event.id = index
    
    # need to store this custom event somewhere
    $game_system.add_custom_event(@map_id, event)
    
    # add event to the map and refresh map
    @events[index] = Game_CustomEvent.new(@map_id, event)
    
    SceneManager.scene.refresh_spriteset if SceneManager.scene_is?(Scene_Map)
  end
  
  
end

class Game_Character
  attr_reader :move_route
end

class Game_CustomEvent < Game_Event
    attr_reader :tags
    attr_reader :fears
    
    def initialize(map_id, event)
        super(map_id, event)
        p event.regions
        @passable_regions = event.regions
        @tags = event.tags
        @fears = event.dangers
        @goals = event.goals
        @range = define_range
        @points = event.points
        @behavior = event.behavior
        @point_index = 0
       
    end
    
    def define_range
      p @fears
      p (@fears+@goals)
      max_distances = (@fears+@goals).collect{ |event| event[1] }
      if max_distances != [] 
        a = max_distances.max
      else
        a = 0
      end
    end
    
    def next_point
      @point_index += 1
      @point_index = 0 if @point_index >= @points.size
    end

    def scan_area
       range = @range
       events = Array.new(range)
       for i in 1..range
           events[i-1] = [] unless events[i-1]
           events[i-1] += $game_map.events_xy(x+i,y)  
           events[i-1] += $game_map.events_xy(x,y+i)    
           events[i-1] += $game_map.events_xy(x-i,y)    
           events[i-1] += $game_map.events_xy(x,y-i) 
         for j in 1..i  
           events[i+j-1] = [] unless events[i+j-1]
           events[i+j-1] += $game_map.events_xy(x+i,y+j) 
           events[i+j-1] += $game_map.events_xy(x+i,y-j) 
           events[i+j-1] += $game_map.events_xy(x-i,y+j)
           events[i+j-1] += $game_map.events_xy(x-i,y-j) 
         end
       end
       return events
    end
      
     def player_route
       if x!=$game_player.x || y!=$game_player.y
         moveto($game_player.x, $game_player.y)
       end
     end
     
     def choose_route
       unless @bool
        p @tags 
        p @fears 
        p @goals
        p @range
        @bool = true
      end
         if @range
         events = scan_area
         dangers = []
         goals = []
         events.each_index{ |range|
           events[range].each{ |event|
            if event.is_a?(Game_CustomEvent)
             if event.tags.any?{ |tag| 
               @fears.any?{ |fear| fear[0] == tag && range <= fear[1] && range >= fear[2] }
              }
              dangers.push(event)
            elsif event.tags.any?{ |tag| 
              @goals.any?{ |goal| goal[0] == tag && range <= goal[1] && range >= goal[2] }
              }
              goals.push(event)
             end
            
           end
          }
         }
         if dangers != []
           p "danger"
           danger_pos = dangers.inject([0,0,]){ |sum,danger|
              [sum[0]+danger.x,sum[1]+danger.y]
          }
          danger_pos.each { |i| i = i/dangers.size }
          
          sx = distance_x_from(danger_pos[0])
          sy = distance_y_from(danger_pos[1])
          if sx.abs > sy.abs
            move_straight(sx > 0 ? 6 : 4)
            move_straight(sy > 0 ? 2 : 8) if !@move_succeed && sy != 0
          elsif sy != 0
            move_straight(sy > 0 ? 2 : 8)
            move_straight(sx > 0 ? 6 : 4) if !@move_succeed && sx != 0
          end
        elsif goals != []
          p "food"
           move_toward_character(goals[0])
         else
          default_route
        end
      end
    end
    
    def move_toward_position(x,y)
       sx = distance_x_from(x)
       sy = distance_y_from(y)
       if sx.abs > sy.abs
        move_straight(sx > 0 ? 4 : 6)
        move_straight(sy > 0 ? 8 : 2) if !@move_succeed && sy != 0
      elsif sy != 0
        move_straight(sy > 0 ? 8 : 2)
        move_straight(sx > 0 ? 4 : 6) if !@move_succeed && sx != 0
      end      
    end
    
    def default_route
      unless @points == [] 
        if x == @points[@point_index][0] &&  y == @points[@point_index][1]
          next_point
        end
      end
        max = @behavior.values.reduce(:+)
        r = rand(max)
        if r > (@behavior[:wait] + @behavior[:turn] + @behavior[:rand_move])
          if points = []
            x = @points[@point_index][0]
            y = @points[@point_index][1]
            move_toward_position(x,y)
          else
             move_random
          end
        elsif r > (@behavior[:turn] + @behavior[:rand_move])
          @wait_count = 20
        elsif r > @behavior[:rand_move]
          turn_random
          @wait_count = 45
        else
          move_random
        end
    end
end

class Event < RPG::Event
    attr_reader :regions
    attr_reader :tags
    attr_reader :dangers
    attr_reader :goals
    attr_reader :points
    attr_reader :all_terrain
    attr_reader :behavior
    
    alias AI_initialize initialize
    def initialize(x,y)
      AI_initialize(x,y)
      @tags = []
      @dangers = []
      @goals = []
      @points = []
      @all_terrain = true
      @behavior = {
          :wait => 10,
          :turn => 10,
          :rand_move => 40,
          :route_move => 40,
      }
    end
    
    def set_regions(regions)
      @regions = regions
      @all_terrain = false
      
    end    
    
    def set_behavior(behavior)
      keys = [:wait,:turn,:route_move,:rand_move]
      if keys.all? { |key| behavior.has_key?(key) }
        @behavior = behavior
      end
    end
    
    def set_moveroute(route)
      @page.move_route = route
    end
    
    def add_tag(tag)
      @tags.push(tag)
    end
    
    def add_danger(danger,max_range,min_range = 0)
      @dangers.push([danger,max_range,min_range])
    end
    
    def add_goal(goal,max_range,min_range = 0)
        @goals.push([goal,max_range,min_range])
    end
      
    def add_points(array)
      array.each{|point| @points.push(point) }
      
    end
end

class Game_Interpreter

    def generate_move_route
      list = []
      list.push( RPG::MoveCommand.new(45,["choose_route"] ) )
      list.push( RPG::MoveCommand.new(0,[] ) )
      move_route = RPG::MoveRoute.new
      move_route.list = list
      move_route.skippable = true

      p move_route
      return move_route
    end
	
	 def player_route
      list = []
      list.push( RPG::MoveCommand.new(45,["player_route"] ) )
      list.push( RPG::MoveCommand.new(0,[] ) )
      move_route = RPG::MoveRoute.new
      move_route.list = list
      return move_route
    end
    
    def setup_dummy_player
       dummy = Event.new(1,1)
       dummy.set_page(0)
       dummy.move_type = 3
       dummy.set_moveroute(player_route)
       dummy.add_tag("player") 
       dummy.move_frequency = 5       
       dummy.through = true
       $game_map.add_event(dummy)
    end
	
	def setup_example_event
        event = Event.new(4,5) #starting position of the event
        event.set_page(0)
        event.move_type = 3  #you need a custom move route for my script to work
        event.move_speed = 4
        event.move_frequency = 5
        event.set_moveroute(generate_move_route) #indicate you want an AI event
        
        behavior = {
          :wait => 10,
          :turn => 0,
          :rand_move => 0,
          :route_move => 10,
        } 
		#ratio for possible event ,in this example the event had 50% chance to wait and 50% to go toward its next point
        event.set_behavior(behavior) #if you remove the line,the game shouldnot crash,there is default_behavior that is applied if you give none
 
        event.character_name = "Actor1"
        event.character_index = 2
        
		event.add_tag("prey") #adds the tag that defines the event
		event.add_tag("bird") #you can have as many tags as you want
		
        event.add_danger(["player",5,3]) #adds the tag for events this event is avoiding
        event.add_danger(["player",5,3]) #first number is the max detecion range and second one is minimum detection range
		
		event.add_goal(["player",2])#works the same way as danger but for the event that you are going to, minimum range is optionnal and default to 0
		#In this example,he event will run away from the player if he is between 3 and 5 tiles away,but if he is 2 tiles away or closer,he will go toards the player(to attack him probably)
		
		
        event.add_points([ [0,0],[16,12],[0,12],[16,0] ] ) #the points on the map the event will try to go to when he isn't doing anything else and he he rolls to follows his route (see behavior)
      
        event.set_regions([1,3])  #indicate the event can only move through the regions whose id are in the array (1 and 3 in this example)
		#if you remove the line,the evnt will not be restricted by regions
        return event
    end
	
end
    