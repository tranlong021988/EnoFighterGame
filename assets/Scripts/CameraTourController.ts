import { _decorator, Component, Node, Vec3, Quat, tween, director, clamp, easing, Tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Controller cho Camera Tour với hỗ trợ Tracking Influence:
 * Giảm ảnh hưởng của tốc độ di chuyển marker lên camera, giúp tracking mượt và cinematic hơn.
 */
@ccclass('CameraTourController')
export class CameraTourController extends Component {

    @property({
        type: [Node],
        displayName: 'Camera Markers',
        tooltip: 'Danh sách các Node/Camera (điểm đánh dấu) cho đường đi.'
    })
    private cameraMarkers: Node[] = [];

    @property({
        range: [0.1, 10.0, 0.1],
        displayName: '1. Transition Time (s)',
        tooltip: 'Thời gian Camera di chuyển giữa các Marker.'
    })
    private travelTime: number = 2.0;

    @property({
        range: [0.0, 60.0, 0.1],
        displayName: '2. Tracking Duration (s)',
        tooltip: 'Thời gian Camera khóa góc nhìn vào marker sau khi đến nơi. 0 = không tracking.'
    })
    private trackingDuration: number = 3.0;

    @property({
        range: [0.01, 1.0, 0.01],
        displayName: '3. Tracking Smoothness',
        tooltip: 'Độ mượt khi theo dõi (giá trị nhỏ sẽ mượt hơn).'
    })
    private trackingSmoothness: number = 0.15;

    @property({
        range: [0.0, 1.0, 0.01],
        displayName: '4. Tracking Influence',
        tooltip: '0 = ảnh hưởng rất ít bởi marker; 1 = camera bám 100% chuyển động của marker.'
    })
    private trackingInfluence: number = 1.0;

    private currentTween: Tween<Node> | null = null;
    private isTourRunning: boolean = false;
    private currentMarkerIndex: number = 0;

    private trackingMarker: Node | null = null;
    private trackingTimer: number = 0;

    start() {
        if (this.cameraMarkers.length < 2) {
            console.warn("Cần ít nhất 2 Camera Marker để chạy Camera Tour.");
            return;
        }

        const startMarker = this.cameraMarkers[0];
        const { position, rotation } = this.getMarkerTransform(startMarker);
        this.node.setWorldPosition(position);
        this.node.setWorldRotation(rotation);

        this.startCameraTour();
    }

    onDestroy() {
        this.stopCameraTour();
    }

    update(dt: number) {
        if (this.trackingMarker) {
            this.followMovingTarget(dt);
        }
    }

    private getMarkerTransform(marker: Node): { position: Vec3, rotation: Quat } {
        const position = marker.worldPosition.clone();
        const rotation = marker.worldRotation.clone();
        return { position, rotation };
    }

    /**
     * Tracking Marker nâng cấp:
     * - Tracking Smoothness: độ mượt theo thời gian
     * - Tracking Influence: mức độ camera bị ảnh hưởng bởi tốc độ của marker
     */
    private followMovingTarget(dt: number) {
        if (!this.trackingMarker) return;

        this.trackingTimer -= dt;

        const { position: targetPos, rotation: targetRot } = this.getMarkerTransform(this.trackingMarker);

        const currentPos = this.node.worldPosition.clone();
        const currentRot = this.node.worldRotation.clone();

        // 1. Blend theo Influence: hạn chế việc camera phải chạy theo marker quá nhanh
        const blendedPos = new Vec3();
        Vec3.lerp(blendedPos, currentPos, targetPos, this.trackingInfluence);

        const blendedRot = new Quat();
        Quat.slerp(blendedRot, currentRot, targetRot, this.trackingInfluence);

        // 2. Sau đó áp dụng Smoothness để tiến tới blendedPos/blendedRot một cách mượt mà
        const lerpFactor = clamp(this.trackingSmoothness * 60 * dt, 0, 1);

        Vec3.lerp(currentPos, currentPos, blendedPos, lerpFactor);
        this.node.setWorldPosition(currentPos);

        Quat.slerp(currentRot, currentRot, blendedRot, lerpFactor);
        this.node.setWorldRotation(currentRot);

        // 3. kết thúc tracking
        if (this.trackingTimer <= 0) {
            this.trackingMarker = null;
            this.currentTween = null;
            this.moveCameraToNextMarker();
        }
    }

    private moveCameraToNextMarker() {
        if (!this.isTourRunning) return;
        if (this.trackingMarker) return;

        const totalMarkers = this.cameraMarkers.length;
        let nextMarkerIndex = (this.currentMarkerIndex + 1) % totalMarkers;
        const targetMarker = this.cameraMarkers[nextMarkerIndex];

        const { position: targetPosition, rotation: targetRotationOriginal } = this.getMarkerTransform(targetMarker);

        // Clone trước khi sửa để không phá quaternion của marker
        const targetRotation = targetRotationOriginal.clone();

        const startRotation = this.node.worldRotation.clone();

        // Shortest Path Slerp optimization
        if (Quat.dot(startRotation, targetRotation) < 0) {
            targetRotation.x *= -1;
            targetRotation.y *= -1;
            targetRotation.z *= -1;
            targetRotation.w *= -1;
        }

        this.currentTween = tween(this.node)
            .to(
                this.travelTime,
                {
                    worldPosition: targetPosition,
                    worldRotation: targetRotation
                },
                { easing: easing.sineInOut }
            )
            .call(() => {
                this.currentMarkerIndex = nextMarkerIndex;

                if (this.trackingDuration > 0) {
                    this.trackingMarker = targetMarker;
                    this.trackingTimer = this.trackingDuration;
                } else {
                    this.moveCameraToNextMarker();
                }
            })
            .start();
    }

    private startCameraTour() {
        if (this.isTourRunning) return;
        this.isTourRunning = true;
        this.currentMarkerIndex = 0;
        this.moveCameraToNextMarker();
    }

    public stopCameraTour() {
        if (!this.isTourRunning) return;
        this.isTourRunning = false;

        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        this.trackingMarker = null;
    }
}
