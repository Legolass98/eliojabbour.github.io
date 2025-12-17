/**
 * [MODULE: PROJECT DATA]
 * This file contains the content for all portfolio projects.
 * EDIT THIS FILE to change text, bullet points, or titles.
 * This separates "Content" from "Structure" (Modularity).
 */

const projectDatabase = {
    // 1. PhD Thesis (The Core Project)
    'mpc': {
        title: "PhD Thesis: MPC-B Framework",
        subtitle: "Shared-Autonomy Control for Human-Robot Collaboration",
        tags: ["C++", "ROS2", "QP Optimization", "Franka Panda"],
        description: `
            <p><strong>The Challenge:</strong> Teleoperating robots in cluttered environments is mentally exhausting. 
            Operators often struggle to judge distances, leading to collisions or slow performance.</p>
            
            <p><strong>The Solution (MPC-B):</strong> I developed a Shared Control framework using Nonlinear Model Predictive Control (NMPC). 
            Instead of just obeying the joystick, the robot predicts the operator's intent 2.5 seconds into the future 
            and solves a constrained optimization problem to blend their input with safety constraints.</p>
        `,
        details: [
            "<strong>Solver Performance:</strong> Custom QP solver running at <5ms per cycle.",
            "<strong>Hardware Validation:</strong> Deployed on Franka Emika Panda arms at INRIA.",
            "<strong>Impact:</strong> 60% reduction in collision risks; 50% faster task completion."
        ],
        hasSimulation: true // Triggers the physics engine
    },

    // 2. Hades (Underwater Robot)
    'hades': {
        title: "Hades: Bio-Inspired ROV",
        subtitle: "14-DOF Eel-Robot for Karst Exploration",
        tags: ["LIRMM", "SolidWorks", "MATLAB", "Biomimetics"],
        description: `
            <p>Designed to explore narrow underground caves (Karst) where traditional propeller-ROVs get stuck. 
            Hades uses undulatory locomotion (like a snake/eel) to glide through tight spaces.</p>
        `,
        details: [
            "<strong>Kinematics:</strong> Developed Euler-Lagrange models for 14-DOF hyper-redundant movement.",
            "<strong>Hydrodynamics:</strong> Validated via ANSYS Fluent CFD to achieve 4.5 m/s potential speed.",
            "<strong>Mechanism:</strong> Designed a waterproof 12-thruster configuration."
        ],
        hasSimulation: false
    },

    // 3. Alyssa (Marine ROV)
    'alyssa': {
        title: "Project ALYSSA",
        subtitle: "5-DOF Inspection Class ROV",
        tags: ["Mechanical Design", "FEA", "Simulink"],
        description: `
            <p>An industrial-grade ROV designed for pipeline inspection at depths up to 100 meters. 
            Focused on structural integrity and hydrodynamic efficiency.</p>
        `,
        details: [
            "<strong>Structural Integrity:</strong> Conducted FEA (ANSYS Static Structural) to validate PVC Sch 80 hull for 100m depth pressure.",
            "<strong>Control:</strong> Simulated PID loops in Simulink/SimMechanics to stabilize pitch and roll.",
            "<strong>Design:</strong> Optimized ellipsoid hull shape for drag reduction."
        ],
        hasSimulation: false
    },

    // 4. Haptics (Internship)
    'haptics': {
        title: "Haptic Teleoperation",
        subtitle: "Force-Feedback Control for Franka Emika",
        tags: ["Pprime CNRS", "Omega.7", "Null Space Control"],
        description: `
            <p>Implemented a bilateral teleoperation system where the operator 'feels' the robot's contact forces 
            through an Omega.7 haptic interface.</p>
        `,
        details: [
            "<strong>Redundancy:</strong> Utilized Null Space control to manage the robot's elbow position without affecting the end-effector.",
            "<strong>Intent Estimation:</strong> Developed algorithms to guess the user's target based on gaze and hand motion.",
            "<strong>Assembly:</strong> Validated on complex pick-and-place assembly tasks."
        ],
        hasSimulation: false
    }
};