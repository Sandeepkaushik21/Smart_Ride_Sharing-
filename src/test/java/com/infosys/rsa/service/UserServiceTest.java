import com.infosys.rsa.exception.UserNotFoundException;
import com.infosys.rsa.model.User;
import com.infosys.rsa.model.Role;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.service.UserService;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.repository.query.FluentQuery;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class UserServiceTest {

    private UserService userService;
    private InMemoryUserRepository repo;

    @BeforeEach
    void setup() throws Exception {
        repo = new InMemoryUserRepository();
        userService = new UserService();

        // Inject repository (since no Spring is used)
        var field = UserService.class.getDeclaredField("userRepository");
        field.setAccessible(true);
        field.set(userService, repo);

        // ---- Seed sample driver user ----
        User driver = new User();
        driver.setId(1L);
        driver.setEmail("driver@mail.com");
        driver.setPassword("password123");
        driver.setName("John Driver");
        driver.setPhone("9999999999");

        Role driverRole = new Role(1L, Role.ERole.ROLE_DRIVER);
        driver.setRoles(Set.of(driverRole));
        driver.setIsApproved(null); // pending driver

        repo.save(driver);
    }

    // ---------------------------------------------------------
    // TEST getUserById
    // ---------------------------------------------------------
    @Test
    void testGetUserById_Found() {
        User user = userService.getUserById(1L);

        assertNotNull(user);
        assertEquals("John Driver", user.getName());
    }

    @Test
    void testGetUserById_NotFound() {
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUserById(200L);
        });
    }

    // ---------------------------------------------------------
    // TEST updateUserProfile
    // ---------------------------------------------------------
    @Test
    void testUpdateUserProfile() {
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

    // ---------------------------------------------------------
    // TEST getAllUsers
    // ---------------------------------------------------------
    @Test
    void testGetAllUsers() {
        assertEquals(1, userService.getAllUsers().size());
    }

    // ---------------------------------------------------------
    // TEST getPendingDrivers
    // ---------------------------------------------------------
    @Test
    void testGetPendingDrivers() {
        List<User> pending = userService.getPendingDrivers();
        assertEquals(1, pending.size());
        assertEquals("John Driver", pending.get(0).getName());
    }

    // ---------------------------------------------------------
    // TEST saveMasterVehicleDetails
    // ---------------------------------------------------------
    @Test
    void testSaveMasterVehicleDetails() {
        Map<String, Object> details = new HashMap<>();
        details.put("vehicleColor", "Red");
        details.put("hasAC", true);

        User updated = userService.saveMasterVehicleDetails(1L, details);

        assertNotNull(updated.getMasterVehicleDetailsJson());
        assertTrue(updated.getMasterVehicleDetailsJson().contains("Red"));
    }

    // ---------------------------------------------------------
    // TEST getMasterVehicleDetails
    // ---------------------------------------------------------
    @Test
    void testGetMasterVehicleDetails() {
        Map<String, Object> details = Map.of(
                "vehicleType", "Sedan",
                "vehicleColor", "Blue"
        );

        userService.saveMasterVehicleDetails(1L, details);

        Map<String, Object> result = userService.getMasterVehicleDetails(1L);

        assertEquals("Sedan", result.get("vehicleType"));
        assertEquals("Blue", result.get("vehicleColor"));
    }

    @Test
    void testGetMasterVehicleDetails_WhenEmpty() {
        User u = repo.findById(1L).get();
        u.setMasterVehicleDetailsJson(null);
        repo.save(u);

//        assertNull(userService.getMasterVehicleDetails(1L));

        Map<String, Object> result = userService.getMasterVehicleDetails(1L);
        assertNotNull(result);
        assertTrue(result.isEmpty());

    }

    @Test
    void testUpdateUserProfile_DoesNotOverrideWithBlankValues() {
        User changes = new User();
        changes.setName("");  // blank
        changes.setPhone("   "); // spaces

        User updated = userService.updateUserProfile(1L, changes);

        // Original name should stay
        assertEquals("John Driver", updated.getName());
        // Original phone should stay
        assertEquals("9999999999", updated.getPhone());
    }


    @Test
    void testGetMasterVehicleDetails_ShouldReturnEmptyMapInsteadOfNull() {
        User u = repo.findById(1L).get();
        u.setMasterVehicleDetailsJson("");
        repo.save(u);

        Map<String, Object> result = userService.getMasterVehicleDetails(1L);

        assertNotNull(result, "Expected empty map instead of null");
        assertTrue(result.isEmpty());
    }

    @Test
    void testSaveMasterVehicleDetails_WhenNullDetails_ShouldThrow() {
        assertThrows(IllegalArgumentException.class, () -> {
            userService.saveMasterVehicleDetails(1L, null);
        });
    }

    @Test
    void testGetPendingDrivers_ShouldIgnoreApprovedDrivers() {
        User u2 = new User();
        u2.setId(2L);
        u2.setEmail("driver2@mail.com");
        u2.setPassword("pass");
        u2.setName("Driver 2");
        u2.setIsApproved(true); // approved driver
        u2.setRoles(Set.of(new Role(2L, Role.ERole.ROLE_DRIVER)));

        repo.save(u2);

        List<User> list = userService.getPendingDrivers();

        // Only the pending one should be returned
        assertEquals(1, list.size());
        assertEquals("John Driver", list.get(0).getName());
    }


    @Test
    void testGetUserById_NullId_ShouldThrow() {
        assertThrows(IllegalArgumentException.class, () -> {
            userService.getUserById(null);
        });
    }



    // =================================================================
    //   IN-MEMORY USER REPOSITORY IMPLEMENTATION
    // =================================================================

    class InMemoryUserRepository implements UserRepository {

        private final Map<Long, User> store = new HashMap<>();
        private final AtomicLong idGen = new AtomicLong(2);

        @Override
        public List<User> findAll() {
            return new ArrayList<>(store.values());
        }

        @Override
        public Optional<User> findById(Long id) {
            return Optional.ofNullable(store.get(id));
        }

        @Override
        public <S extends User> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(idGen.getAndIncrement());
            }
            store.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<User> findByEmail(String email) {
            return store.values().stream()
                    .filter(u -> email.equals(u.getEmail()))
                    .findFirst();
        }

        @Override
        public Optional<User> findByPhone(String phone) {
            return store.values().stream()
                    .filter(u -> phone.equals(u.getPhone()))
                    .findFirst();
        }

        @Override
        public Boolean existsByEmail(String email) {
            return findByEmail(email).isPresent();
        }

        @Override
        public Boolean existsByPhone(String phone) {
            return findByPhone(phone).isPresent();
        }

        // --------------------------------------------------------
        // Required abstract methods (stub implementations)
        // --------------------------------------------------------

        @Override
        public boolean existsById(Long id) {
            return store.containsKey(id);
        }

        @Override
        public long count() {
            return store.size();
        }

        @Override
        public void deleteById(Long id) {
            store.remove(id);
        }

        @Override
        public void delete(User entity) {
            store.remove(entity.getId());
        }

        @Override
        public void deleteAllById(Iterable<? extends Long> longs) {

        }

        @Override
        public void deleteAll(Iterable<? extends User> entities) {

        }

        @Override
        public void deleteAll() {
            store.clear();
        }

        @Override
        public <S extends User> List<S> saveAll(Iterable<S> entities) {
            List<S> list = new ArrayList<>();
            for (S e : entities) list.add(save(e));
            return list;
        }

        @Override
        public List<User> findAllById(Iterable<Long> ids) {
            List<User> list = new ArrayList<>();
            for (Long id : ids) {
                if (store.containsKey(id)) list.add(store.get(id));
            }
            return list;
        }

        @Override
        public void flush() {}

        @Override
        public <S extends User> S saveAndFlush(S entity) {
            return save(entity);
        }

        @Override
        public <S extends User> List<S> saveAllAndFlush(Iterable<S> entities) {
            return List.of();
        }

        @Override
        public void deleteAllInBatch() {}

        @Override
        public User getOne(Long aLong) {
            return null;
        }

        @Override
        public User getById(Long aLong) {
            return null;
        }

        @Override
        public User getReferenceById(Long aLong) {
            return null;
        }

        @Override
        public void deleteAllInBatch(Iterable<User> entities) {}

        @Override
        public void deleteAllByIdInBatch(Iterable<Long> ids) {
            for (Long id : ids) store.remove(id);
        }

        @Override
        public List<User> findAll(org.springframework.data.domain.Sort sort) {
            return findAll(); // ignore sorting
        }

        @Override
        public org.springframework.data.domain.Page<User> findAll(
                org.springframework.data.domain.Pageable pageable
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User> Optional<S> findOne(
                org.springframework.data.domain.Example<S> example
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User> List<S> findAll(
                org.springframework.data.domain.Example<S> example
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User> List<S> findAll(
                org.springframework.data.domain.Example<S> example,
                org.springframework.data.domain.Sort sort
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User> Page<S> findAll(
                org.springframework.data.domain.Example<S> example,
                org.springframework.data.domain.Pageable pageable
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User> long count(
                org.springframework.data.domain.Example<S> example
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User> boolean exists(
                org.springframework.data.domain.Example<S> example
        ) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends User, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) {
            return null;
        }
    }

}
