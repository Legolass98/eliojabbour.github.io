/**
 * [MODULE: PROJECT DATA]
 * Updated with the specific path for the Alyssa GLB model.
 */

const projectDatabase = {
    // 1. PhD Thesis
    'mpc': {
        title: "PhD Thesis: MPC-B Framework",
        subtitle: "Shared-Autonomy Control for Improving Human-Robot Collaboration",
        tags: ["C++", "ROS2", "QP Optimization", "Franka Panda", "Haptics"],
        description: `
            <p><strong>The Challenge:</strong> Teleoperating robots in cluttered or constrained environments is mentally exhausting for human operators. 
            They must simultaneously manage task goals while avoiding collisions, singularities, and joint limits.</p>
            
            <p><strong>The Solution (MPC-B):</strong> I developed a novel Shared Control framework using Nonlinear Model Predictive Control (NMPC). 
            Unlike traditional impedance control, MPC-B predicts the operator's intent 2.5 seconds into the future 
            and solves a constrained optimization problem (QP) in real-time to blend their input with autonomous safety constraints.</p>

            <p><strong>Key Innovation:</strong> The system doesn't just block dangerous commands; it smoothly "nudges" the operator back to a safe path 
            using haptic feedback (Omega.7) and autonomous trajectory correction.</p>
        `,
        details: [
            "<strong>Solver Performance:</strong> Custom QP solver running at <5ms per control cycle (200Hz).",
            "<strong>Hardware Validation:</strong> Deployed and validated on 7-DOF Franka Emika Panda arms at INRIA.",
            "<strong>User Study Results:</strong> N=20 participants. Demonstrated 60% reduction in collision risks and 50% faster task completion compared to linear teleoperation.",
            "<strong>Adaptive Assistance:</strong> Integrated Adaptive Kalman Filtering to estimate human intent and adjust assistance levels dynamically."
        ],
        hasSimulation: true,
        has3DModel: false
    },

    // 2. Hades (Underwater Robot)
    'hades': {
        title: "Hades: Bio-Inspired ROV",
        subtitle: "14-DOF Eel-Robot for Karst Exploration",
        tags: ["LIRMM", "SolidWorks", "MATLAB", "Biomimetics", "CFD"],
        description: `
            <p><strong>Context:</strong> Exploring narrow, flooded underground caves (Karst networks) is dangerous for divers and impossible for bulky propeller-ROVs. 
            Traditional thrusters disturb sediment, reducing visibility to zero.</p>

            <p><strong>The Robot:</strong> 'Hades' is a bio-inspired, hyper-redundant robot that mimics the undulatory locomotion of an eel. 
            Its slender profile allows it to glide through narrow fissures.</p>
        `,
        details: [
            "<strong>Kinematics:</strong> Developed comprehensive Euler-Lagrange kinematic models for 14-DOF hyper-redundant movement in MATLAB.",
            "<strong>Hydrodynamics:</strong> Conducted extensive CFD analysis (ANSYS Fluent) to validate hull stability and achieve a 4.5 m/s potential top speed.",
            "<strong>Mechanism:</strong> Designed a waterproof 12-thruster configuration for high-maneuverability and redundancy.",
            "<strong>Redundancy Analysis:</strong> Analyzed 6-DOF actuation capabilities across various body shapes to ensure fault tolerance."
        ],
        hasSimulation: false,
        has3DModel: false
    },

    // 3. Alyssa (Marine ROV) - UPDATED PATH
    'alyssa': {
        title: "Project ALYSSA",
        subtitle: "5-DOF Inspection Class ROV",
        tags: ["Mechanical Design", "FEA", "Simulink", "Marine Robotics"],
        description: `
            <p><strong>Objective:</strong> Design an industrial-grade inspection ROV capable of operating at depths up to 100 meters for pipeline and infrastructure inspection.</p>
            
            <p><strong>Engineering:</strong> Focused on hydrodynamic efficiency to maximize battery life and structural integrity to withstand deep-water pressure.</p>
        `,
        details: [
            "<strong>Structural Integrity:</strong> Conducted Finite Element Analysis (ANSYS Static Structural) to validate the PVC Sch 80 hull against 10 bar (100m) of hydrostatic pressure.",
            "<strong>Control System:</strong> Simulated PID control loops in Simulink/SimMechanics to stabilize pitch, roll, and depth.",
            "<strong>Hydrodynamics:</strong> Optimized an ellipsoid hull shape to minimize drag coefficient (Cd) using CFD simulations.",
            "<strong>Propulsion:</strong> Designed a 6-thruster vector configuration for 5-DOF independent control."
        ],
        hasSimulation: false,
        has3DModel: true,
        // PATH UPDATED: Converted backslashes to forward slashes for web compatibility
        modelPath: "img/profilepicture/Alyssaglb.glb"
    },

    // 4. Haptics (Internship)
    'haptics': {
        title: "Haptic Teleoperation",
        subtitle: "Force-Feedback Control for Franka Emika",
        tags: ["Pprime CNRS", "Omega.7", "Null Space Control", "C++"],
        description: `
            <p><strong>Research:</strong> Investigated bilateral teleoperation strategies where the operator 'feels' the robot's interaction forces. 
            This provides the 'sense of touch' necessary for delicate assembly tasks.</p>
        `,
        details: [
            "<strong>Redundancy Management:</strong> Utilized Null Space control to allow the robot's elbow to move autonomously (avoiding collisions) while the end-effector follows the human's hand.",
            "<strong>Intent Estimation:</strong> Developed algorithms to predict the user's next target based on gaze and initial hand motion.",
            "<strong>Task Execution:</strong> Validated the system on complex pick-and-place assembly scenarios using a Force Dimension Omega.7 haptic device."
        ],
        hasSimulation: false,
        has3DModel: false
    }
};