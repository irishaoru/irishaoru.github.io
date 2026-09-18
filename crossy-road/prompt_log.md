# Prompt Log

## AI Tools and Models Used

- Kiro
- ChatGPT (mainly for technical issues on deploying with Github or clarifying the assignment criteria)

## In-Class Prompts

### Prompt 1
build a version of crossy road. make sure it captures the core mechanics of the game as well as the aethestics.

### Prompt 2
sometimes when the duck gets hit by a car it doesn't get flattened

### Prompt 3
also when i'm on the grasss it keeps moving and it's not supposed to do that. also the setup should look more like this: right now the perspective is going straight forward rather than more above and diagonal.

### Prompt 4
its not the right angle and why it is fading towards the top? also it should drown in the water and right now it's not doing so immediately and i got through the water without even having to go on a log

## At-Home Prompts

### Prompt 1
implement these features: collect coins with each step the duck takes, initial interface when users first see the game like this image i just uploaded, make it more like this upper angle like hte image i uploaded and everytime the duck moves a step, it quacks

### Prompt 2
don't put a black box around crossy road and just the black outline with the 3d look for the initial page. also redesign the UI to feel playful, colorful, and polished like an arcade/mobile game. Use large readable score text, bright but cohesive colors, chunky buttons, soft shadows, rounded corners, and clear visual hierarchy. Keep all code compatible with GitHub Pages and use only plain HTML/CSS/JS with no build step or server.

### Prompt 3
Change the overall theme of the game into CMU Crossy Road while keeping the existing core Crossy Road mechanics.
The player should control a CMU student crossing campus. Hazards should include:
On roads: buses, scooters, bikes, and other vehicles
On walking paths/grass: other students rushing to class, trees, benches, and campus obstacles
The player should move forward, backward, left, and right to avoid hazards and obstacles.
Instead of making the game infinite like normal Crossy Road make it level-based with a countdown timer. Goal is to get from the starting point to the destination before time runs out without getting hit.
For the first level make the route go from the Margaret Morrison area toward Tepper. Environment should feel  like a college campus and be inspired by CMU.
Add a difficulty selector:
Easy = more time
Medium = less time
Hard = least time
Higher difficulty can also slightly increase the speed or frequency of hazards.
Keep the game compatible with plain HTML/CSS/JavaScript and GitHub Pages. 
Keep the current game working and modify it incrementally rather than rebuilding everything from scratch.
Visually keep the playful 2.5D / voxel-inspired Crossy Road style rather than attempting full 3D.
I can provide CMU campus reference images if useful.

### Prompt 4
ok idk why but i see the landing page and can't do anything from there

### Prompt 5
can you make the game longer? it's too short right now. also make the UI more like CMU. also can you add more cmu hints like maybe this tyope of flag looking thing or something like the image on the far right i uploaded? but yea in general the leftmost image of hte aerial view that looks sorta animated is a good reference for what you should do. also can you add some buildings in the grassy areas as obstacles or places players have to walk around and stuff

### Prompt 6 
i want the buildings to haveblue windows and black top. i want the windows to be like a square attached to a semi oval shape. also still missing cmu signage and flags

### Prompt 7
can you actually just make it infinite so no start or end destination just like regular crossy road but with a cmu theme? also could you make it like crossy road where you can pick diffeent players. the standard would just be a regular cmu student (he has a red cmu hoodie with jeans and white sneakers). i want to create more options that users can pick from and you can click left and right to actualy see what each character looks like. right nowi'm thinking we add a depressed SCS student (prob wearing headphones, holding a computer and very tired looking, one drama student (colorful clothes, colorful hair, very cheerful, one business student wearing formal business attire)

### Prompt 8
Keep the current infinite Crossy Road mode exactly as it is. Do not remove or replace it.
Add back in the timed mode “Rush to Class” alongside the existing infinite mode.
On the start screen, let the player choose between:
Classic Mode — the current infinite Crossy Road gameplay. The player keeps moving forward, the score increases with distance, and the run ends when they are hit by a hazard.
Rush to Class Mode — a timed CMU-themed level where the player must travel from the Margaret Morrison area to Tepper before time runs out.
For Rush to Class Mode, after selecting the mode, let the player choose:
Easy: 90 seconds
Medium: 60 seconds
Hard: 40 seconds
The player should not manually enter a timer value.
In Rush to Class Mode:
Show “GET TO TEPPER” as the objective.
Display a visible countdown timer at the top of the screen.
When 10 seconds or less remain, make the timer red or pulse.
If the timer reaches 0, show “You’re late to class!”
If the player reaches Tepper in time, show a success screen with the remaining time and score.
Colliding with a hazard still causes game over.
Higher difficulty should also slightly increase hazard speed or frequency.
Keep the CMU student character and CMU-themed hazards such as buses, scooters, bikes, pedestrians, trees, and campus obstacles in both modes.
Reuse as much of the existing game code as possible. Do not rebuild the entire project. Add a mode-selection system that changes the win condition and timer behavior depending on the selected mode.
Keep everything compatible with plain HTML/CSS/JavaScript and GitHub Pages. Do not use npm, a build step, or a server.

### Prompt 9
how to actually start playing? i don't see any button
