from cmu_graphics import *
import random

class Button:
    def __init__(self, left, top, width, height, text, color, action):
        self.left = left
        self.top = top
        self.width = width
        self.height = height
        self.text = text
        self.color = color
        self.action = action

    def handleClick(self, app, x, y):
        if (self.left <= x <= self.left + self.width and
                self.top <= y <= self.top + self.height):
            self.action(app)

    def draw(self):
        drawRect(self.left, self.top, self.width, self.height,
                 fill=self.color, border='black')
        drawLabel(self.text, self.left + self.width / 2,
                  self.top + self.height / 2, bold=True)
                  
class Bot:
    def __init__(self, birdX, birdRadius, jumpStrength, gravity, mistakeRange = 1):
        self.x = birdX
        self.y = 250
        self.velocity = 0
        self.score = 0
        self.numLives = 0
        self.alive = True
        self.radius = birdRadius
        self.jumpStrength = jumpStrength
        self.gravity = gravity
        self.mistakeRange = mistakeRange #determines how hard the bot is to beat
    
    def update(self, app):
        r = self.radius
        
        if random.randint(1, self.mistakeRange) == 1:
            checkX = self.x
        else:
            checkX = self.x - r
            
        nextPipe = None
        for pipe in app.pipes:
            if pipe['x'] + app.pipeWidth > checkX:
                nextPipe = pipe
                break 
            
        if nextPipe is not None:
            gapTop = nextPipe['topHeight']
            gapBottom = nextPipe['topHeight'] + nextPipe['gap']
            gapCenter = (gapTop + gapBottom) / 2
        
            if self.y > gapBottom - 10:
                self.velocity = self.jumpStrength
            elif self.y < gapTop + 10:
                pass
            elif self.velocity >= 0 and self.y > gapCenter:
                self.velocity = self.jumpStrength
        
        self.velocity += self.gravity
        self.y += self.velocity 
        
        if self.y - r <= 0 or self.y + r >= app.height:
            self.alive = False 
            return 
        
        for pipe in app.pipes:
            capExtra = 6
            pipeLeft = pipe['x'] - capExtra 
            pipeRight = pipe['x'] + app.pipeWidth + capExtra 
            if self.x + r >= pipeLeft and self.x - r <= pipeRight:
                if self.y - r <= pipe['topHeight']:
                    self.alive = False
                    return
                elif self.y + r >= pipe['topHeight'] + pipe['gap']:
                    self.alive = False
                    return 
                
        for pipe in app.pipes:
            if not pipe['botCounted'] and pipe['x'] + app.pipeWidth < self.x:
                pipe['botCounted'] = True
                self.score += 1
        
    def draw(self):
        x, y = self.x, self.y
        r = self.radius
        drawCircle(x, y, r, fill = 'yellow', opacity = 35)
        drawOval(x-3, y + 6, 14, 8, fill = 'gold', opacity = 35)
        drawPolygon(x+12, y-3, x+12, y+3, x+20, y, fill = 'orange', opacity = 35)
        drawCircle(x+6, y - 5, 3, fill = 'white', opacity = 35)
        drawCircle(x+7, y-5, 2, fill = 'black', opacity = 35)

def goHome(app):    app.screen = 'home'
def goPlaying(app): app.screen = 'playing'
def goLife(app):    app.screen = 'life'
def goGravity(app): app.screen = 'gravity'
def goFlying(app):  app.screen = 'flying'
def goPipeMode(app): app.screen = 'pipeMode'
def goFoodMode(app): app.screen = 'foodMode'
def goEnemyMode(app): app.screen = 'enemyMode'
def goBotMode(app): app.screen = 'botMode'

def setEasy(app):   app.difficulty = 'easy';   app.passesForOneLife = 5
def setMedium(app): app.difficulty = 'medium'; app.passesForOneLife = 10
def setHard(app):   app.difficulty = 'hard';   app.passesForOneLife = 15

def setGravityDefault(app): app.gravity = 0.6
def setGravityLow(app):     app.gravity = 0.4
def setGravityHigh(app):    app.gravity = 0.8

def setSpeedDefault(app): app.pipeSpeed = 3
def setSpeedSlow(app):    app.pipeSpeed = 2
def setSpeedFast(app):    app.pipeSpeed = 5

def setPipeModeDefault(app):     app.pipeMode = None
def setPipeModeSlidingGap(app):  app.pipeMode = 'slidingGap'
def setPipeModeVariableGap(app): app.pipeMode = 'variableGap'

def setFoodOrange(app):    app.foodMode = 'orange'
def setFoodBlueberry(app): app.foodMode = 'blueberry'
def setFoodApple(app):     app.foodMode = 'apple'

def setEnemyMode(app):  app.enemyMode = 'enemy'

def setBotEasy(app): app.botMode = 'bot'; app.botDifficulty = 5
def setBotMedium(app): app.botMode = 'bot'; app.botDifficulty = 20
def setBotHard(app): app.botMode = 'bot'; app.botDifficulty = 100

def onAppStart(app):
    resetApp(app)

def resetApp(app):
    app.width = 400
    app.height = 600

    #Screen
    app.screen = 'home'
    app.difficulty = None
    app.passesForOneLife = 5
    app.pipeMode = None
    app.foodMode = 'berry'
    app.enemyMode = None
    app.botMode = None
    app.botDifficulty = 20

    # Bird
    app.birdX = 100
    app.birdY = 300
    app.birdRadius = 15
    app.birdVelocity = 0
    app.gravity = 0.6
    app.jumpStrength = -8
    app.invincibleSteps = 0
    app.food = []
    
    #Bot
    app.bot = Bot(app.birdX, app.birdRadius, app.jumpStrength, app.gravity, app.botDifficulty)

    # Game state
    app.score = 0
    app.lives = 0
    app.gameOver = False
    app.highScore = 0
    app.winner = None

    # Pipes
    app.pipeWidth = 60
    app.pipeGap = 160
    app.pipeSpeed = 3
    app.pipes = []
    addPipe(app, 250)
    addPipe(app, 450)
    addPipe(app, 650)
    app.enemies = []
    addEnemy(app, app.pipes)
    addFood(app, app.pipes)

    backBtn = Button(10, 10, 80, 40, 'Back', 'lightGray', goHome)
    app.homeButtons = [
        Button(110, 220, 180, 50, 'Play!',       'lightGreen', goPlaying),
        Button(25,  350, 105, 50, 'Life Mode',   'khaki',      goLife),
        Button(150, 350, 105, 50, 'Gravity',     'khaki',      goGravity),
        Button(270, 350, 105, 50, 'Flying Mode', 'khaki',      goFlying),
        Button(25,  420, 105, 50, 'Pipe Mode',   'khaki',      goPipeMode),
        Button(150, 420, 105, 50, 'Food Mode',   'khaki',      goFoodMode),
        Button(270, 420, 105, 50, 'Enemy Mode',   'khaki',      goEnemyMode),
        Button(25,  490, 105, 50, 'Bot Mode',   'khaki',      goBotMode),
    ]
    app.lifeButtons = [
        Button(70, 220, 260, 50, 'Default: 1 life/5 passes', 'lightGreen', setEasy),
        Button(70, 300, 260, 50, 'Medium: 1 life/10 passes', 'khaki',      setMedium),
        Button(70, 380, 260, 50, 'Hard: 1 life/15 passes',   'lightCoral', setHard),
        backBtn,
    ]
    app.gravityButtons = [
        Button(70, 220, 260, 50, 'Default: Moderate gravity',      'lightGreen', setGravityDefault),
        Button(70, 300, 260, 50, 'Low Gravity: Easier to control', 'khaki',      setGravityLow),
        Button(70, 380, 260, 50, 'High Gravity: Faster falling',   'lightCoral', setGravityHigh),
        backBtn,
    ]
    app.flyingButtons = [
        Button(70, 220, 260, 50, 'Default: Moderate speed', 'lightGreen', setSpeedDefault),
        Button(70, 300, 260, 50, 'Slow flying speed',       'khaki',      setSpeedSlow),
        Button(70, 380, 260, 50, 'High Flying Speed',       'lightCoral', setSpeedFast),
        backBtn,
    ]
    app.pipeModeButtons = [
        Button(110, 220, 180, 50, 'Default',      'lightGreen', setPipeModeDefault),
        Button(110, 300, 180, 50, 'Sliding Gap',  'khaki',      setPipeModeSlidingGap),
        Button(110, 380, 180, 50, 'Variable Gap', 'lightCoral', setPipeModeVariableGap),
        backBtn,
    ]
    app.foodModeButtons = [
        Button(110, 220, 180, 50, 'Orange',      'orange',     setFoodOrange),
        Button(110, 300, 180, 50, 'Blueberry',   'blueViolet', setFoodBlueberry),
        Button(110, 380, 180, 50, 'Green Apple', 'limeGreen',  setFoodApple),
        backBtn,
    ]
    app.enemyModeButtons = [
        Button(110, 220, 180, 50, 'Activate Enemy',      'red',     setEnemyMode),
        backBtn]
        
    app.botModeButtons = [
        Button(70, 220, 260, 50, 'Easy Bot', 'lightGreen', setBotEasy),
        Button(70, 300, 260, 50, 'Medium Bot',       'khaki',      setBotMedium),
        Button(70, 380, 260, 50, 'Hard Bot',       'lightCoral', setBotHard),
        backBtn]

def addFood(app, pipes):
    for pipe in pipes:
        topHeight = pipe['topHeight']
        bottomY = topHeight + pipe['gap']
        foodY  = random.randint(topHeight + app.birdRadius, bottomY - app.birdRadius)
        foodX = random.randint(pipe['x'] + app.birdRadius, pipe['x'] + app.pipeWidth - app.birdRadius)
        food = {
            'x': foodX,
            'y': foodY,
            'pipe': pipe,
            'offsetFromTop': foodY - topHeight,
            'collected': False
        }
        app.food.append(food)
        
def addEnemy(app, pipes):
    if app.enemyMode != None:
        for pipe in pipes:
            side = random.choice(['top', 'bottom'])
            enemy = {
                'pipe': pipe,
                'side': side,
                'offsetY': 0,
                'maxOffset': 50,
                'speed': 2,
                'attacking': False,
                'retreating': False,
                'hasAttacked': False,
                'radius': 20,
                'mouthAngle': 10,
            }
            app.enemies.append(enemy)

def addPipe(app, x):
    topPipeHeight = random.randint(80, 300)
    if app.pipeMode == 'variableGap':
        gap = random.randint(100, 220)
    else:
        gap = app.pipeGap
    pipe = {
        'x': x,
        'topHeight': topPipeHeight,
        'slideDir': 1,
        'gap': gap,
        'counted': False,
        'botCounted': False,
    }
    app.pipes.append(pipe)

def endGame(app, winner=None):
    if app.score > app.highScore:
        app.highScore = app.score
    app.winner = winner
    app.gameOver = True

def playAgain(app):
    app.birdY = 300
    app.birdVelocity = 0
    app.food = []
    app.enemies = []
    app.score = 0
    app.lives = 0
    app.gameOver = False
    app.winner = None
    app.pipes = []
    addPipe(app, 250)
    addPipe(app, 450)
    addPipe(app, 650)
    addEnemy(app, app.pipes)
    addFood(app, app.pipes)
    app.bot = Bot(app.birdX, app.birdRadius, app.jumpStrength, app.gravity, app.botDifficulty)

def onMousePress(app, mouseX, mouseY):
    if app.screen == 'playing' and app.gameOver:
        if 60 <= mouseX <= 180 and 370 <= mouseY <= 410:
            playAgain(app)
        elif 220 <= mouseX <= 340 and 370 <= mouseY <= 410:
            resetApp(app)
        return

    screenButtons = {
        'home':     app.homeButtons,
        'life':     app.lifeButtons,
        'gravity':  app.gravityButtons,
        'flying':   app.flyingButtons,
        'pipeMode': app.pipeModeButtons,
        'foodMode': app.foodModeButtons,
        'enemyMode': app.enemyModeButtons,
        'botMode': app.botModeButtons,
    }
    if app.screen in screenButtons:
        for btn in screenButtons[app.screen]:
            btn.handleClick(app, mouseX, mouseY)
    

def onKeyPress(app, key):
    if app.screen == 'playing' and app.gameOver:
        pass
    elif app.screen == 'playing' and not app.gameOver:
        if key == 'space':
            app.birdVelocity = app.jumpStrength

def onStep(app):
    if app.screen != 'playing':
        return

    if app.gameOver:
        return

    # Bird movement
    app.birdVelocity += app.gravity
    app.birdY += app.birdVelocity
    
    if app.invincibleSteps > 0:
        app.invincibleSteps -= 1

    if app.botMode != None:
        app.bot.update(app)

    # Pipe movement
    for pipe in app.pipes:
        pipe['x'] -= app.pipeSpeed
        if app.pipeMode == 'slidingGap':
            pipe['topHeight'] += pipe['slideDir'] * 2
            if pipe['topHeight'] > 300 or pipe['topHeight'] < 80:
                pipe['slideDir'] *= -1

    for food in app.food:
        food['x'] -= app.pipeSpeed
        if app.pipeMode == 'slidingGap':
            food['y'] = food['pipe']['topHeight'] + food['offsetFromTop']

    # Remove old pipe and its enemies
    if len(app.pipes) > 0 and app.pipes[0]['x'] + app.pipeWidth < 0:
        removed = app.pipes.pop(0)
        app.enemies = [e for e in app.enemies if e['pipe'] is not removed]

    # Add new pipe
    if app.pipes[-1]['x'] < 250:
        addPipe(app, app.pipes[-1]['x'] + 200)
        addFood(app, app.pipes[-1:])
        addEnemy(app, app.pipes[-1:])

    # Enemy logic
    for enemy in app.enemies:
        pipe = enemy['pipe']
        if not enemy['attacking'] and not enemy['retreating']:
            if pipe['x'] < 200 and random.randint(1, 60) == 1:
                enemy['attacking'] = True

        if enemy['attacking']:
            enemy['offsetY'] += enemy['speed']
            enemy['mouthAngle'] = min(60, 10 + enemy['offsetY'])
            if enemy['offsetY'] >= enemy['maxOffset']:
                enemy['attacking'] = False
                enemy['retreating'] = True

        elif enemy['retreating']:
            enemy['offsetY'] -= enemy['speed']
            enemy['mouthAngle'] = max(10, 10 + enemy['offsetY'])
            if enemy['offsetY'] <= 0:
                enemy['retreating'] = False
                enemy['offsetY'] = 0

        enemyX = pipe['x'] + app.pipeWidth / 2
        if enemy['side'] == 'top':
            enemyY = pipe['topHeight'] + enemy['offsetY']
        else:
            enemyY = pipe['topHeight'] + pipe['gap'] - enemy['offsetY']
        dist = ((app.birdX - enemyX) ** 2 + (app.birdY - enemyY) ** 2) ** 0.5
        if dist < app.birdRadius + enemy['radius'] and enemy['offsetY'] > 5 and app.invincibleSteps == 0:
            if app.lives > 0:
                app.lives -= 1
                app.invincibleSteps = 60
                enemy['attacking'] = False
                enemy['retreating'] = True
            else:
                endGame(app)
                
    if app.botMode != None:
        for pipe in app.pipes:
            if not pipe['counted'] and pipe['x'] + app.pipeWidth < app.birdX:
                pipe['counted'] = True
                app.score += 1
        if not app.bot.alive:
            endGame(app, winner = 'You')
        if app.birdY - app.birdRadius <= 0 or app.birdY + app.birdRadius >= app.height:
            endGame(app, winner = 'Bot')
        for pipe in app.pipes:
            handlePipeCollision(app, pipe)
    else:
        for food in app.food:
            if not food['collected']:
                distance = ((app.birdX - food['x']) ** 2 + (app.birdY - food['y']) ** 2) ** 0.5
                if distance < app.birdRadius + 5:
                    food['collected'] = True
                    app.score += 1
                    if app.score % app.passesForOneLife == 0:
                        app.lives += 1

    # Top wall collision
        if app.birdY - app.birdRadius <= 0:
            if app.lives > 0:
                app.lives -= 1
                app.birdY = app.birdRadius + 1
                app.birdVelocity = abs(app.birdVelocity) * 0.7
            else:
                endGame(app)

    # Bottom wall collision
        if app.birdY + app.birdRadius >= app.height:
            if app.lives > 0:
                app.lives -= 1
                app.birdY = app.height - app.birdRadius - 1
                app.birdVelocity = -abs(app.birdVelocity) * 0.7
            else:
                endGame(app)

    # Pipe collisions
        for pipe in app.pipes:
            handlePipeCollision(app, pipe)

def handlePipeCollision(app, pipe):
    birdLeft = app.birdX - app.birdRadius
    birdRight = app.birdX + app.birdRadius
    birdTop = app.birdY - app.birdRadius
    birdBottom = app.birdY + app.birdRadius

    capExtra = 6
    pipeLeft = pipe['x'] - capExtra
    pipeRight = pipe['x'] + app.pipeWidth + capExtra
    topPipeBottom = pipe['topHeight']
    bottomPipeTop = pipe['topHeight'] + pipe['gap']

    # Check if bird overlaps this pipe horizontally
    if birdRight >= pipeLeft and birdLeft <= pipeRight:

        # Hits top pipe
        if birdTop <= topPipeBottom:
            if app.botMode != None:
                endGame(app, winner = 'Bot')
            else:
                if app.lives > 0:
                    app.lives -= 1
                    app.birdY = topPipeBottom + app.birdRadius + 1
                    app.birdVelocity = abs(app.birdVelocity) * 0.7
                else:
                    endGame(app)

        # Hits bottom pipe
        elif birdBottom >= bottomPipeTop:
            if app.botMode != None:
                endGame(app, winner = 'Bot')
            else:
                if app.lives > 0:
                    app.lives -= 1
                    app.birdY = bottomPipeTop - app.birdRadius - 1
                    app.birdVelocity = -abs(app.birdVelocity) * 0.7
                else:
                    endGame(app)

def redrawAll(app):
    screenDrawFns = {
        'home':     drawHomeScreen,
        'life':     drawLifeScreen,
        'gravity':  drawGravityScreen,
        'flying':   drawFlyingScreen,
        'pipeMode': drawPipeModeScreen,
        'foodMode': drawFoodModeScreen,
        'enemyMode': drawEnemyModeScreen,
        'botMode': drawBotModeScreen,
    }
    if app.screen in screenDrawFns:
        screenDrawFns[app.screen](app)
    else:
        drawGameScreen(app)

def drawScreenBackground(app, title, bgColor):
    drawRect(0, 0, app.width, app.height, fill=bgColor)
    drawLabel(title, app.width/2, 100, size=32, bold=True)

def drawHomeScreen(app):
    drawScreenBackground(app, 'Flappy Bird', 'skyBlue')
    drawLabel('Set up your game mode!', app.width/2, 160, size=22, bold=True)
    for btn in app.homeButtons:
        btn.draw()

def drawLifeScreen(app):
    drawScreenBackground(app, 'Choose Life Mode', 'skyBlue')
    for btn in app.lifeButtons:
        btn.draw()

def drawGravityScreen(app):
    drawScreenBackground(app, 'Choose Gravity Mode', 'skyBlue')
    for btn in app.gravityButtons:
        btn.draw()

def drawFlyingScreen(app):
    drawScreenBackground(app, 'Flying Mode', 'skyBlue')
    for btn in app.flyingButtons:
        btn.draw()

def drawPipeModeScreen(app):
    drawScreenBackground(app, 'Pipe Mode', 'lightBlue')
    for btn in app.pipeModeButtons:
        btn.draw()

def drawFoodModeScreen(app):
    drawScreenBackground(app, 'Food Mode', 'lightBlue')
    for btn in app.foodModeButtons:
        btn.draw()
        
def drawEnemyModeScreen(app):
    drawScreenBackground(app, 'Enemy Mode', 'lightBlue')
    for btn in app.enemyModeButtons:
        btn.draw()
        
def drawBotModeScreen(app):
    drawScreenBackground(app, 'Bot Mode', 'lightBlue')
    for btn in app.botModeButtons:
        btn.draw()



def drawLandscape(app):
    # Sky
    drawRect(0, 0, app.width, app.height, fill='deepSkyBlue')
    # Sun
    drawCircle(350, 60, 30, fill='yellow')
    drawCircle(350, 60, 24, fill='gold')
    # Clouds
    drawOval(70, 80, 90, 32, fill='white')
    drawOval(100, 68, 65, 26, fill='white')
    drawOval(260, 110, 95, 34, fill='white')
    drawOval(295, 98, 68, 26, fill='white')
    # Ground and grass
    drawRect(0, app.height - 30, app.width, 30, fill='saddleBrown')
    drawRect(0, app.height - 42, app.width, 16, fill='forestGreen')

def drawGameScreen(app):
    drawLandscape(app)

    # Draw enemies before pipes so the pipe covers the part still inside
    for enemy in app.enemies:
        if enemy['offsetY'] > 0:
            drawEnemy(app, enemy)

    for pipe in app.pipes:
        drawPipe(app, pipe)
        
    if app.botMode == None:
        for food in app.food:
            if not food['collected']:
                if app.foodMode == 'orange':
                    drawCircle(food['x'], food['y'], 8, fill='orange', border='darkorange')
                    drawLine(food['x'], food['y'] - 8, food['x'] + 3, food['y'] - 13, fill='green', lineWidth=2)
                elif app.foodMode == 'blueberry':
                    drawCircle(food['x'], food['y'], 6, fill='blueViolet', border='darkViolet')
                    drawCircle(food['x'], food['y'] - 4, 2, fill='lightBlue')
                elif app.foodMode == 'apple':
                    drawCircle(food['x'], food['y'], 8, fill='limeGreen', border='green')
                    drawLine(food['x'], food['y'] - 8, food['x'], food['y'] - 13, fill='saddleBrown', lineWidth=2)
                    drawLine(food['x'], food['y'] - 11, food['x'] + 5, food['y'] - 14, fill='green', lineWidth=2)
                else:
                    drawCircle(food['x'], food['y'], 8, fill='red', border='darkRed')
                    drawLine(food['x'], food['y'] - 8, food['x'] + 4, food['y'] - 13, fill='green', lineWidth=2)
    
    if app.botMode != None and app.bot.alive:
        app.bot.draw()

    drawBird(app)
    
    if app.botMode != None:
        drawLabel(f'You: {app.score}', 70, 30, size = 20, bold = True)
        drawLabel(f'Bot: {app.bot.score}', 330, 30, size = 20, bold = True, fill = 'gray')
    else:
        drawLabel(f'Score: {app.score}', 70, 30, size=20, bold=True)
        drawLabel(f'Lives: {app.lives}', 70, 55, size=20, bold=True)

    if app.gameOver:
        if app.botMode != None and app.winner != None:
            drawLabel(f'{app.winner} wins!', app.width/2, app.height/2-60, size = 30, bold = True)
            drawLabel(f'You: {app.score} Bot: {app.bot.score}', app.width/2, app.height/2-20, size = 20)
        else:
            drawLabel('Game Over', app.width/2, app.height/2 - 60, size=30, bold=True)
            drawLabel(f'Score: {app.score}', app.width/2, app.height/2 - 25, size=20)
            drawLabel(f'High Score: {app.highScore}', app.width/2, app.height/2 + 5, size=20)
        drawRect(60, 370, 120, 40, fill='lightGreen', border='black')
        drawLabel('Play Again', 120, 390, size=16, bold=True)
        drawRect(220, 370, 120, 40, fill='lightCoral', border='black')
        drawLabel('Restart', 280, 390, size=16, bold=True)
        

def drawBird(app):
    x, y = app.birdX, app.birdY
    r = app.birdRadius
    # Body
    drawCircle(x, y, r, fill='yellow')
    # Wing
    drawOval(x - 3, y + 6, 14, 8, fill='gold')
    # Beak
    drawPolygon(x + 12, y - 3, x + 12, y + 3, x + 20, y, fill='orange')
    # Eye white and pupil
    drawCircle(x + 6, y - 5, 3, fill='white')
    drawCircle(x + 7, y - 5, 2, fill='black')

def drawEnemy(app, enemy):
    pipe = enemy['pipe']
    x = pipe['x'] + app.pipeWidth / 2
    if enemy['side'] == 'top':
        y = pipe['topHeight'] + enemy['offsetY']
        # Pac-Man facing down (mouth opens downward into the gap)
        startAngle = 270 + enemy['mouthAngle'] / 2
    else:
        y = pipe['topHeight'] + pipe['gap'] - enemy['offsetY']
        # Pac-Man facing up (mouth opens upward into the gap)
        startAngle = 90 + enemy['mouthAngle'] / 2
    r = enemy['radius']
    sweepAngle = 360 - enemy['mouthAngle']
    drawArc(x, y, r * 2, r * 2, startAngle, sweepAngle, fill='yellow', border='orange')

def drawPipe(app, pipe):
    x = pipe['x']
    topHeight = pipe['topHeight']
    bottomY = topHeight + pipe['gap']

    capHeight = 18
    capExtra = 6

    # Top pipe body and cap
    drawRect(x, 0, app.pipeWidth, topHeight - capHeight, fill='green')
    drawRect(x - capExtra, topHeight - capHeight, app.pipeWidth + capExtra * 2, capHeight, fill='green')

    # Bottom pipe cap and body
    drawRect(x - capExtra, bottomY, app.pipeWidth + capExtra * 2, capHeight, fill='green')
    drawRect(x, bottomY + capHeight, app.pipeWidth, app.height - bottomY - capHeight, fill='green')


def main():
    runApp()

main()