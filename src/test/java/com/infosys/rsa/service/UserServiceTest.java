import com.infosys.rsa.exception.UserNotFoundException;
import com.infosys.rsa.model.Role;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository; // we MOCK this

    @InjectMocks
    private UserService userService; // this gets auto-wired with mocks

    private User driver;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);

        driver = new User();
        driver.setId(1L);
        driver.setEmail("driver@mail.com");
        driver.setPassword("password123");
        driver.setName("John Driver");
        driver.setPhone("9999999999");
        driver.setRoles(Set.of(new Role(1L, Role.ERole.ROLE_DRIVER)));
        driver.setIsApproved(null);
    }

    // ---------------------------------------------------------
    // TEST getUserById
    // ---------------------------------------------------------
    @Test
    void testGetUserById_Found() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));

        User user = userService.getUserById(1L);

        assertNotNull(user);
        assertEquals("John Driver", user.getName());
    }

    @Test
    void testGetUserById_NotFound() {
        when(userRepository.findById(200L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class,
                () -> userService.getUserById(200L));
    }

    // ---------------------------------------------------------
    // TEST updateUserProfile
    // ---------------------------------------------------------
    @Test
    void testUpdateUserProfile() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User changes = new User();
        changes.setName("Updated Name");
        changes.setPhone("8888888888");
        changes.setVehicleModel("Honda City");
        changes.setLicensePlate("KA09AB1234");
        changes.setVehicleCapacity(4);

        User updated = userService.updateUserProfile(1L, changes);

        assertEquals("Updated Name", updated.getName());
        assertEquals("8888888888", updated.getPhone());
        assertEquals("Honda City", updated.getVehicleModel());
        assertEquals("KA09AB1234", updated.getLicensePlate());
        assertEquals(4, updated.getVehicleCapacity());
    }

    @Test
    void testUpdateUserProfile_DoesNotOverrideWithBlankValues() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User changes = new User();
        changes.setName("");       // blank
        changes.setPhone("   ");   // spaces

        User updated = userService.updateUserProfile(1L, changes);

        assertEquals("John Driver", updated.getName());
        assertEquals("9999999999", updated.getPhone());
    }

    // ---------------------------------------------------------
    // TEST getAllUsers
    // ---------------------------------------------------------
    @Test
    void testGetAllUsers() {
        when(userRepository.findAll()).thenReturn(List.of(driver));

        assertEquals(1, userService.getAllUsers().size());
    }

    // ---------------------------------------------------------
    // TEST getPendingDrivers
    // ---------------------------------------------------------
    @Test
    void testGetPendingDrivers() {
        when(userRepository.findAll()).thenReturn(List.of(driver));

        List<User> pending = userService.getPendingDrivers();

        assertEquals(1, pending.size());
    }

    @Test
    void testGetPendingDrivers_ShouldIgnoreApprovedDrivers() {
        User approved = new User();
        approved.setId(2L);
        approved.setName("Driver 2");
        approved.setIsApproved(true);
        approved.setRoles(Set.of(new Role(2L, Role.ERole.ROLE_DRIVER)));

        when(userRepository.findAll()).thenReturn(List.of(driver, approved));

        List<User> pending = userService.getPendingDrivers();

        assertEquals(1, pending.size());
        assertEquals("John Driver", pending.get(0).getName());
    }

    // ---------------------------------------------------------
    // TEST saveMasterVehicleDetails
    // ---------------------------------------------------------
    @Test
    void testSaveMasterVehicleDetails() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> details = Map.of(
                "vehicleColor", "Red",
                "hasAC", true
        );

        User updated = userService.saveMasterVehicleDetails(1L, details);

        assertNotNull(updated.getMasterVehicleDetailsJson());
        assertTrue(updated.getMasterVehicleDetailsJson().contains("Red"));
    }

    @Test
    void testSaveMasterVehicleDetails_WhenNullDetails_ShouldThrow() {
        assertThrows(IllegalArgumentException.class,
                () -> userService.saveMasterVehicleDetails(1L, null));
    }

    // ---------------------------------------------------------
    // TEST getMasterVehicleDetails
    // ---------------------------------------------------------
    @Test
    void testGetMasterVehicleDetails() {
        driver.setMasterVehicleDetailsJson("{\"vehicleType\":\"Sedan\",\"vehicleColor\":\"Blue\"}");

        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));

        Map<String, Object> result = userService.getMasterVehicleDetails(1L);

        assertEquals("Sedan", result.get("vehicleType"));
        assertEquals("Blue", result.get("vehicleColor"));
    }

    @Test
    void testGetMasterVehicleDetails_WhenEmpty() {
        driver.setMasterVehicleDetailsJson(null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));

        Map<String, Object> result = userService.getMasterVehicleDetails(1L);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetMasterVehicleDetails_ShouldReturnEmptyMapInsteadOfNull() {
        driver.setMasterVehicleDetailsJson("");

        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));

        Map<String, Object> result = userService.getMasterVehicleDetails(1L);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetUserById_NullId_ShouldThrow() {
        assertThrows(IllegalArgumentException.class,
                () -> userService.getUserById(null));
    }
}
