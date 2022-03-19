import * as THREE from 'three';

import metaversefile from 'metaversefile';

const { useApp, useFrame, useInternals, useLocalPlayer, useLoaders, usePhysics, useCleanup, useActivate } = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localQuaternion4 = new THREE.Quaternion();


export default () => {
  const app = useApp();
  const { renderer, camera } = useInternals();
  const localPlayer = useLocalPlayer();
  const physics = usePhysics();
  const textureLoader = new THREE.TextureLoader();


  /*app.addEventListener('wearupdate', e => {
    if (e.wear) {
      if (app.glb) {

        sitSpec = app.getComponent('sit');
        if (sitSpec) {
          const {instanceId} = app;
          const localPlayer = useLocalPlayer();

          const rideBone = sitSpec.sitBone ? sitSpec.sitBone : null;
          const sitAction = {
            type: 'sit',
            time: 0,
            animation: sitSpec.subtype,
            controllingId: instanceId,
            controllingBone: rideBone,
          };
          localPlayer.setControlAction(sitAction);
        }
      }
    } else {
      //_unwear();
    }
  });*/
  
  //####################################################### load skateboard glb ####################################################
  {    
    let skateboard;
    let velocity = new THREE.Vector3();
    let physicsIds = [];
    let activateCb = null;
    let sitSpec = null;
    let isSticky = true;
    const maxSpeed = 200;
    let elapsedTime = 0;
    (async () => {
        const u = `${baseUrl}/skateboard/assets/skateboard.glb`;
        skateboard = await new Promise((accept, reject) => {
            const {gltfLoader} = useLoaders();
            gltfLoader.load(u, accept, function onprogress() {}, reject);
            
        });
        app.add(skateboard.scene);

        /*const physicsId = physics.addBoxGeometry(
          new THREE.Vector3(0, 2, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(0.15, 0.15, 0.45),
          true
        );
        physicsIds.push(physicsId);*/

        const physicsId = physics.addGeometry(skateboard.scene);
        physicsIds.push(physicsId);
    
        

        skateboard.scene.traverse(o => {
          o.castShadow = true;
        });

        app.updateMatrixWorld();
    })();
    activateCb = () => {
        if (
          app.getComponent('wear') ||
          app.getComponent('pet') ||
          app.getComponent('sit')
        ) {
          app.wear();
          sitSpec = app.getComponent('sit');
          const {instanceId} = app;
          const sitAction = {
            type: 'sit',
            time: 0,
            animation: sitSpec.subtype,
            controllingId: instanceId,
            controllingBone: null,
          };
          localPlayer.setControlAction(sitAction);
        }
    };
    useCleanup(() => {
      for (const physicsId of physicsIds) {
        physics.removeGeometry(physicsId);
      }
    });
    useActivate(() => {
      activateCb && activateCb();
    });

    //let clock = new THREE.Clock();
    useFrame(({ timeDiff }) => {

      //elapsedTime = timestamp;
      //console.log(clock);

      console.log(timeDiff);


      const downQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.5);
      const forwardVec = new THREE.Vector3( 0, 0, 1 );
      const backwardVec = new THREE.Vector3( 0, 0,-1 );
      forwardVec.applyQuaternion(app.quaternion);
      backwardVec.applyQuaternion(app.quaternion);
      
      if (localPlayer.avatar && sitSpec) {
        
        let tempQuat = new THREE.Quaternion();
        //localPlayer.avatar.app.visible = false;

        if(velocity.length() < maxSpeed) {
          velocity.add(localVector.copy(localPlayer.characterPhysics.keysDirection));
        }
        
        app.position.add(localVector2.copy(velocity).multiplyScalar(timeDiff/10000));
        
        const resultDown = physics.raycast(app.position, downQuat);
        const resultForward = physics.raycast(app.position, app.quaternion);
        
        if(resultForward) {
          let normalVecForward = localVector.fromArray(resultForward.normal);
          if(resultForward.distance < 0.5) {
            if(normalVecForward.x === 1 || normalVecForward.x === -1 || normalVecForward.z === 1 || normalVecForward.z === -1 ) {
              velocity.set(0,0,0);
            }
          }
        }

        if(resultDown) {

          let normalVec = localVector.fromArray(resultDown.normal);
          let up = new THREE.Vector3(0,1,0);
          let axis = new THREE.Vector3().crossVectors(up.clone(), normalVec.clone()).normalize();
          let radians = Math.acos(localVector.clone(normalVec).dot(up));

          normalVec.y !== 1 && velocity.length() >= 0 ? isSticky = false : isSticky = true;

          if(resultDown.distance < 0.16) {
            tempQuat
            .setFromUnitVectors(
              localVector.set(0, 0, -1),
              localVector2.set(velocity.x, 0, velocity.z).normalize()
            )
            .premultiply(localQuaternion2.setFromAxisAngle(axis, radians));

            app.position.y = resultDown.point[1] + 0.15;
            app.quaternion.slerp(tempQuat, 0.1);
          }
          else {
            tempQuat
            .setFromUnitVectors(
              localVector.set(0, 0, -1),
              localVector2.set(velocity.x, velocity.y, velocity.z).normalize()
            );
            app.quaternion.slerp(tempQuat, Math.sin(0.5 + 15000/550000) * 0.05);
            localVector.copy(new THREE.Vector3(0,-20.8,0))
              .multiplyScalar(15000/550000);

            velocity.add(localVector);
          }
        }
        else {
          tempQuat
            .setFromUnitVectors(
              localVector.set(0, 0, -1),
              localVector2.set(velocity.x, velocity.y, velocity.z).normalize()
            );
            app.quaternion.slerp(tempQuat, Math.sin(0.5 + 15000/550000) * 0.05);
            localVector.copy(new THREE.Vector3(0,-9.8*2,0))
              .multiplyScalar(15000/550000);

            velocity.add(localVector);
        }

        velocity.x *= 0.995;
        velocity.y *= 0.995;
        velocity.z *= 0.995;

        app.updateMatrixWorld();
      }

    });
  }

  app.setComponent(
      "sit",
      {
        "subtype": "",
        "sitOffset": [0, 0, 0]
      }
  );

  return app;
};