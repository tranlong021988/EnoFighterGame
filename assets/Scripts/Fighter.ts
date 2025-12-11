import { MeshRenderer, Color, tween, Node, Material, Vec4,_decorator,Component,animation, randomRangeInt, Scheduler, Director, director, random, ValueType, ParticleSystem } from 'cc';
import { GameManager } from './GameManager';
import { TimeScale } from './TimeScaleManager';
const { ccclass, property } = _decorator;

@ccclass('Fighter')
export class Fighter extends Component {
    // --- Các chỉ số Tấn công (Giữ nguyên) ---
    
    

    @property(Material)
    public currentMat:Material;
    @property({ 
        displayName: 'Strike Rate', 
        tooltip: 'Tỉ lệ giành lượt đánh (Raw Value)',
        type: Number 
    })
    public strikeRate: number = 80;

    @property({ 
        displayName: 'Critical Rate (%)', 
        tooltip: 'Xác suất Critical Hit (0-100)',
        type: Number 
    })
    public criticalRate: number = 25; // %

    @property({ 
        displayName: 'Basic Damage', 
        tooltip: 'Sát thương cơ bản',
        type: Number 
    })
    public basicDamage: number = 80;

    @property({ 
        displayName: 'Critical Damage', 
        tooltip: 'Sát thương Chí mạng',
        type: Number 
    })
    public criticalDamage: number = 150;

    // --- CÁC CHỈ SỐ PHÒNG THỦ MỚI ---
    
    @property({ 
        displayName: 'Evasion Rate (%)', 
        tooltip: 'Xác suất Né đòn hoàn toàn (0-100)',
        type: Number 
    })
    public evasionRate: number = 15; // %

    @property({ 
        displayName: 'Flat Defense', 
        tooltip: 'Giảm Sát thương Tuyệt đối nếu không né được',
        type: Number 
    })
    public flatDefense: number = 30;

    // --- Các chỉ số về Trạng thái (Giữ nguyên) ---
    
    @property({ 
        displayName: 'Max Health', 
        readonly: true,
        type: Number 
    })
    public maxHealth: number = 1000;

    @property({ 
        displayName: 'Current Health', 
        type: Number 
    })
    public currentHealth: number = 1000;
    @property(ParticleSystem)
    public leftTrail:ParticleSystem = null;
    @property(ParticleSystem)
    public rightTrail:ParticleSystem = null;
    @property(ParticleSystem)
    public hitDamageVFX:ParticleSystem;
    private criticalVFX:ParticleSystem = null;
    public isCriticalAttack:boolean = false;
    public hitByCriticalAttack:boolean = false;

    private currentTrail:ParticleSystem;

    public competitor:Fighter = null!;
    public gameManager:GameManager = null!;
    private animControl:animation.AnimationController;
    private currentAttackId:number = -1;
    private currentBlockId:number = -1;
    private currentHitId:number = -1;

    private isAnimEnd:Boolean = false;

    // --- Phương thức ---

    /**
     * Phương thức xử lý việc nhận sát thương.
     * @param damage Lượng sát thương cuối cùng phải nhận.
     * @returns Lượng máu bị mất.
     */
    start(): void {
        TimeScale.init();
        this.animControl = this.node.getComponent(animation.AnimationController);
    }
    public startHitDamageVFX(){
        this.hitDamageVFX.play();
        this.hitDamageVFX.node.children.forEach(child => {
        let ps = child.getComponent(ParticleSystem); // Or cc.ParticleSystem for 3D
        if (ps) {
           // ps.playOnLoad = true; // Start if not set in editor
            ps.play(); // If playOnLoad is false
        }
    });
    }
    public startTrail(trailNum:number){
        if(trailNum==0){
            this.currentTrail = this.leftTrail;
        }else{
            this.currentTrail = this.rightTrail;
        }
        
        this.currentTrail?.play();
        if(this.isCriticalAttack){
            this.currentTrail?.node.children.forEach(child =>{
                this.criticalVFX ??= child.getComponent(ParticleSystem); 
                this.criticalVFX.play();
            })
        }
    }
    public stopTrail(){
        this.currentTrail?.stopEmitting();
        if(this.isCriticalAttack){
            this.isCriticalAttack = false;
            this.currentTrail?.node.children.forEach(child =>{
              //  this.criticalVFX ??= child.getComponent(ParticleSystem);
                this.criticalVFX?.stopEmitting();
                this.criticalVFX = null;
            })
        }
        this.currentTrail = null;
    }
    public takeDamage(damage: number): number {
        if (this.currentHealth <= 0) return 0;

        // Chỉ chịu sát thương dương
        const damageToTake = Math.max(0, damage); 
        
        const damageTaken = Math.min(damageToTake, this.currentHealth);
        this.currentHealth -= damageTaken;
        
        if (this.currentHealth < 0) {
            this.currentHealth = 0;
        }

        // Dùng toFixed(2) để demo dễ nhìn hơn
        console.log(`[${this.node.name}] Mất ${damageTaken.toFixed(2)} Máu. Máu còn lại: ${this.currentHealth.toFixed(2)}`);
        this.flashDamageEffect(new Color(255, 0, 0, 255));
        return damageTaken;
    }
    
    /**
     * Kiểm tra xem đấu sĩ còn sống không.
     */
    public isAlive(): boolean {
        return this.currentHealth > 0;
        
    }

    public flashDamageEffect(flashColor:Color): void {
   // const meshRenderer = this.getComponent(MeshRenderer);
    if (this.currentMat==null) {
        console.warn('MeshRenderer hoặc Material không được tìm thấy. Không thể chạy hiệu ứng flash.');
        return;
    }

    const material = this.currentMat;
    const originalColor = new Color(0, 0, 0, 0); 
    //const flashColor = new Color(255, 0, 0, 255); 
    const flashDuration = 0.08; 
    const returnDuration = 0.08; 
    
    const colorControl = { ratio: 0 }; 
    const tempColor = new Color(); 

    // Dừng mọi tween cũ
    tween(material).stop(); 

    // Bắt đầu Tweening
    tween(colorControl)
        // 1. FLASH: Tween từ màu gốc (ratio=0) đến màu đỏ (ratio=1)
        .to(flashDuration, { ratio: 1 }, {
            onUpdate: (target: { ratio: number }) => {
                Color.lerp(tempColor, originalColor, flashColor, target.ratio);
                material.setProperty( 'emissive', tempColor);
            }
        })
        // 2. TRẢ VỀ: Tween từ màu đỏ (ratio=1) về màu gốc (ratio=0)
        .to(returnDuration, { ratio: 0 }, {
            onUpdate: (target: { ratio: number }) => {
                // --- SỬ DỤNG (1 - target.ratio) ĐỂ ĐẢO NGƯỢC TỈ LỆ ---
                const reverseRatio = 1 - target.ratio;
                Color.lerp(tempColor, flashColor, originalColor, reverseRatio);
                material.setProperty( 'emissive', tempColor);
            }
        })
       // .start();
    }

    // --- PHƯƠNG THỨC MỚI: TÍNH TOÁN CHỈ SỐ CHIẾN LỰC ---

    /**
     * Tính toán Chỉ số Chiến lực (Combat Rating) dựa trên các chỉ số tấn công và phòng thủ.
     * CR = (Tần suất Tấn công * Sát thương Trung bình Gây ra) / Hiệu suất Phòng thủ
     * @param standardDamage Sát thương Thô Tiêu chuẩn để định lượng hiệu suất phòng thủ (mặc định 100).
     * @returns Chỉ số Chiến lực.
     */
    public getFinalCombatRating(standardDamage: number = 100): number {
        // Chuyển tỉ lệ phần trăm sang dạng thập phân
        const critRateDec = this.criticalRate / 100;
        const evaRateDec = this.evasionRate / 100;
        
        // --- 1. Sát thương Trung bình Gây ra (D_Avg) ---
        // D_Avg = (D_crit * R_crit) + (D_basic * (1 - R_crit))
        const avgDamageOutput = 
            (this.criticalDamage * critRateDec) + 
            (this.basicDamage * (1 - critRateDec));
        
        // --- 2. Hiệu suất Phòng thủ (E_Def) ---
        // E_Def = (1 - R_Eva) * (Max(0, D_Std - D_Flat) / D_Std)
        
        // Xác suất đòn đánh trúng (không né được)
        const hitProbability = 1 - evaRateDec; 

        // Tỉ lệ sát thương còn lại sau khi trừ Flat Defense (trên 1 đòn tiêu chuẩn)
        const damageRetained = Math.max(0, standardDamage - this.flatDefense);
        const damageRetentionRate = damageRetained / standardDamage;
        
        // Tỉ lệ Sát thương Phải Chịu Trung bình
        const avgDamageTakenRate = hitProbability * damageRetentionRate;

        // Xử lý trường hợp E_Def bằng 0 (chỉ xảy ra nếu R_Eva = 100% và/hoặc Flat Def >= D_Std)
        if (avgDamageTakenRate <= 0) {
            // Nếu có khả năng hấp thụ 100% sát thương, CR là vô cực (hoặc giá trị cực lớn)
            return Number.MAX_SAFE_INTEGER;
        }

        // --- 3. Tính Chỉ số Chiến lực (CR) ---
        // CR = (Strike Rate * D_Avg) / E_Def
        const combatRating = Math.round((this.strikeRate * avgDamageOutput) / avgDamageTakenRate);

        return combatRating;
    }
    private seedRandomAttackId(min:number, max:number){
        let randomAttackId = randomRangeInt(min,max);
        if(randomAttackId==this.currentAttackId){
           // this.seedRandomAttackId(min,max);
           randomAttackId++;
           if(randomAttackId>max-1){
            randomAttackId = 0;
           }
        }
        this.currentAttackId = randomAttackId;
        
    }
    ResetCombatStateToIdle(event:any){
       // console.log("endddddddddddddddddddddddddddddddddddddddddddddddd");
      //  this.animControl.setValue("CombatStateId",0);
        //this.animControl.setValue("BlockId",-1);
    }
    public doAttack(){
        this.isAnimEnd = false;
        this.animControl.setValue("CombatStateId",-1);
         this.animControl.setValue("AttackId",-1);
         this.animControl.setValue("HitId",-1);
       

        this.animControl.setValue("BlockId",-1);
        //let anim:animation.AnimationController =this.node.getComponent(animation.AnimationController);
        this.animControl.setValue("CombatStateId",1);
        this.seedRandomAttackId(0,5);
        this.animControl.setValue("AttackId",this.currentAttackId);
        
        //this.animControl.setValue("CombatStateId",0);
    }
    public doDefense(){
        this.isAnimEnd = false;
        this.animControl.setValue("CombatStateId",-1);
         this.animControl.setValue("HitId",-1);
         this.animControl.setValue("BlockId",-1);
        
        this.animControl.setValue("AttackId",-1);
       this.animControl.setValue("CombatStateId",2);
     //  this.animControl.setValue("BlockId",0);
       let competitorCombatState = this.competitor.animControl.getValue("CombatStateId"); //console.log(competitorCombatState);
      
       // Nếu đối phương tấn công
       
       if(competitorCombatState==1){
       // console.log("defense-----------------------------------------------");
            let competitorAttackId = this.competitor.animControl.getValue("AttackId");
            let options;
            switch (competitorAttackId){
                case 0: 
                    options = [0,3,4,5];
                    break;
                case 1:
                    options= [0,3,4,5];
                    break;
                case 2:
                    options= [2,3,5];
                    break;
                 case 3:
                    options= [1,3,4];
                    break;
                 case 4:
                    options= [3,4,5];
                    break;
            }
           // console.log("+++++++++++++++++++++++++++++++++++++++++ old:"+this.currentBlockId);
            let defense = this.getRandomValueFromArray(options,this.currentBlockId).valueOf(); //console.log("defense:----------------------------------------------"+defense);
            this.currentBlockId = defense;
          //  console.log("+++++++++++++++++++++++++++++++++++++++++ new:"+this.currentBlockId);
            this.animControl.setValue("BlockId",defense);
          //  console.log( this.animControl.getValue("CombatStateId")+"---------------------------"+this.animControl.getValue("BlockId"));
            
            
       }
    }
    private getRandomValueFromArray(arr:number[],current:Number=-1):Number{
        // Assuming you have an array named 'myArray'
        let myArray = arr;

        // Generate a random index
        // Math.random() returns a float between 0 (inclusive) and 1 (exclusive)
        // Multiply by array.length to get a value within the array's index range
        // Math.floor() rounds down to the nearest whole number, ensuring a valid integer index
        let randomIndex = Math.floor(Math.random() * myArray.length);

        // Access the element at the random index
        let randomValue = myArray[randomIndex];
        if(randomValue==current){
            randomIndex++;
            if(randomIndex>myArray.length-1){
                randomIndex = 0;
            }
            randomValue = myArray[randomIndex];
            current = randomValue;
           // console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
        }   
        return randomValue;
    }
    
    public doDamage(){
        this.isAnimEnd = false;
        if(this.competitor.isCriticalAttack){
            this.hitByCriticalAttack = true;
        }
      //  let options = [0,1];
         let competitorCombatState = this.competitor.animControl.getValue("CombatStateId"); //console.log(competitorCombatState);
      
       // Nếu đối phương tấn công
       
       if(competitorCombatState==1){
       // console.log("defense-----------------------------------------------");
            let competitorAttackId:any = this.competitor.animControl.getValue("AttackId");
           /* let options;
            switch (competitorAttackId){
                case 0: 
                    options = [0,3,4,5];
                    break;
                case 1:
                    options= [0,3,4,5];
                    break;
                case 2:
                    options= [2,3,5];
                    break;
                 case 3:
                    options= [1,3,4];
                    break;
                 case 4:
                    options= [3,4,5];
                    break;
            }*/
            
        this.animControl.setValue("CombatStateId",-1);
        this.animControl.setValue("BlockId",-1);
        this.animControl.setValue("HitId",-1);
        this.animControl.setValue("AttackId",-1);
        this.animControl.setValue("CombatStateId",4);
        //let hitId = competitorAttackId;// this.getRandomValueFromArray(options,this.currentHitId).valueOf();
        this.currentHitId = competitorAttackId;
        this.animControl.setValue("HitId", this.currentHitId);
       }
       
    }
    startSlowMotion(scale:number){
       let rd = randomRangeInt(0,10);
        if(this.isCriticalAttack || this.hitByCriticalAttack){
            TimeScale.setScale(scale);
        }
        
    }
    stopSlowMotion(){
        TimeScale.setScale(1);
        this.hitByCriticalAttack = false;
    }
    AnimEnd(){
       
       /* this.isAnimEnd = true;
        if(this.isAnimEnd&&this.competitor.isAnimEnd){
            console.log("--------------------------------------------------- End Anim "+this.isAnimEnd+" "+this.competitor.isAnimEnd);
            this.gameManager.Fight();
        }else{
            console.log("---------------------------------------------------Not End Anim !");
        }*/
        
    }
}